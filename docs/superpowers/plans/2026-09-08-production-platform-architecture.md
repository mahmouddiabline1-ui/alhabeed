# AlHabeed Production Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn AlHabeed from a local-first prototype into a secure, monetized, observable cross-platform party game with authoritative multiplayer, VIP subscriptions, purchasable packs and characters, responsible advertising, and verified mobile/web payments.

**Architecture:** Start as a modular monolith with explicit domain boundaries and one authoritative real-time game runtime. Use PostgreSQL for durable business data, Redis for ephemeral room state and coordination, object storage/CDN for media, and an immutable purchase ledger for entitlements. Package the React client with Capacitor for iOS and Android while retaining the web version.

**Tech Stack:** TypeScript, React/Vite, Capacitor, Fastify, Socket.IO, PostgreSQL/Neon, Redis, Drizzle ORM, Zod, Cloudflare Pages/R2/CDN, Railway, StoreKit 2, Google Play Billing, Stripe or Paymob for web checkout, OpenTelemetry, Sentry.

## Global Constraints

- The server is authoritative for timers, question selection, answers, votes, scoring, ownership, and entitlements.
- No correct answer or answer authorship leaves the server before the reveal phase.
- Mobile digital goods use Apple In-App Purchase and Google Play Billing.
- Payment benefits are granted only after server-side verification.
- No card number, CVV, Apple credential, or Google credential is stored by AlHabeed.
- Every payment webhook and game command is idempotent.
- Guest play remains available; purchases require a recoverable account.
- VIP never changes scoring odds and never creates pay-to-win behavior.
- Ads never interrupt answering, voting, reveal, or an active social interaction.
- Paid online question content is delivered just in time; client-side content cannot be treated as secret.
- Arabic RTL, mobile accessibility, reduced motion, and low-bandwidth behavior are release requirements.

---

## 1. Target System Boundaries

```text
Web / iOS / Android
        |
        | HTTPS + WebSocket, short-lived access token
        v
Fastify API modular monolith on Railway
  |-- Identity and Profile
  |-- Catalog and Content
  |-- Entitlements and Billing
  |-- Rooms and Game Runtime
  |-- Moderation and Reports
  |-- Ads and Consent Configuration
  |-- Admin API
        |
        +--> PostgreSQL: users, catalog, purchases, results, audit
        +--> Redis: live rooms, presence, rate limits, leases, queues
        +--> R2/CDN: card art, character art, audio, localized media
        +--> Apple / Google / Web payment providers
        +--> Analytics, errors, traces and alerts
```

The first production release runs one API deployment and one worker deployment from the same repository. The modules communicate through typed interfaces and domain events in-process. A module becomes a network service only after measured scaling or isolation needs justify it.

## 2. Product and Monetization Rules

### Free tier

- Join and create standard rooms.
- Core packs and all three launch modes.
- Three free characters.
- Interstitial only after a completed match, capped to one per 12 minutes.
- Optional rewarded ad for one temporary pack trial in the next match.

### VIP subscription

- Monthly and annual products: `vip_monthly` and `vip_annual`.
- Removes display and interstitial ads.
- Unlocks advanced host controls, VIP characters, profile frames, room themes, and rotating VIP packs.
- VIP entitlement follows the account across web, iOS, and Android when platform policy permits.
- Subscription cancellation keeps access until `validUntil`; refund/revocation removes access through provider notifications.

### One-time products

- Question packs: `pack_<slug>` as non-consumable purchases.
- Characters and cosmetic bundles: `character_<slug>` and `cosmetic_<slug>` as non-consumables.
- The room can use a paid pack when the host owns it; guests do not need to buy it.
- Do not launch coins or randomized loot boxes in v1. They add ledger, refund, disclosure, child-safety, and economy-balancing risk without improving the core party loop.

### Ad placements

| Placement | Format | Rule |
|---|---|---|
| Home/store footer | banner/native | Hidden for VIP; no deceptive card styling |
| After final score | interstitial | Frequency cap; never before the score is readable |
| Temporary pack preview | rewarded | User explicitly opts in; failure never consumes the reward |
| Lobby | house promotion | Promote owned/unowned packs without third-party tracking |
| Answer/vote/reveal | none | Preserve timing, trust, and social flow |

## 3. Repository Structure

```text
apps/
  web/                 React web client moved from client/
  mobile/              Capacitor shell and native billing/ad bridges
  api/                 Fastify composition root and HTTP/WebSocket adapters
  worker/              payment webhooks, provider sync, cleanup and notifications
packages/
  contracts/           Zod schemas and shared public DTOs
  game-domain/         deterministic room aggregate and scoring rules
  identity/            authentication, sessions and account linking
  catalog/             products, packs, questions, characters and availability
  billing/             purchase ledger, provider adapters and entitlements
  observability/       logs, tracing, metrics and redaction
content/
  sources/             question provenance and media licensing records
infra/
  migrations/          PostgreSQL schema migrations
  railway/             API, worker and Redis deployment configuration
  cloudflare/          Pages, R2, cache and security configuration
```

Each package exports a public `index.ts`. No module reads another module's database tables directly; it calls the exported service or consumes a domain event.

## 4. Core Data Model

| Table | Critical fields and constraints |
|---|---|
| `users` | UUID, status, locale, ageBand, createdAt; soft deletion state |
| `auth_identities` | userId, provider, providerSubject; unique provider+subject |
| `sessions` | hashed refresh token, userId, deviceId, expiresAt, revokedAt |
| `profiles` | userId, displayName, selectedCharacterId, frameId |
| `products` | SKU, type, status, platform mappings, metadata version |
| `packs` | ID, slug, title, access tier, content version, publish state |
| `questions` | packId, mode, prompt, answer, explanation, source and review state |
| `media_assets` | storage key, digest, license, attribution, dimensions |
| `characters` | ID, slug, art assets, rarity label, access product |
| `purchases` | provider transaction ID, userId, SKU, state, original transaction ID; unique provider+transaction |
| `purchase_events` | immutable normalized provider events and received timestamp |
| `entitlements` | userId, resourceType, resourceId, sourcePurchaseId, validUntil, revokedAt |
| `rooms` | code, hostId, state, configuration, version, created/closed timestamps |
| `room_players` | roomId, user/guest ID, join order, final score, connection state |
| `game_results` | roomId, result JSON, content version, anti-cheat flags |
| `consent_records` | user/device, consent version, regional choices, timestamp |
| `reports` | reporter, target type/ID, reason, status, moderator |
| `webhook_inbox` | provider, event ID, payload digest, state; unique provider+event ID |
| `audit_logs` | actor, action, target, request ID, IP prefix, immutable metadata |

Money is represented as integer minor units plus ISO currency. Purchase records are never overwritten; state changes append `purchase_events` and update a derived entitlement inside one database transaction.

## 5. Game Runtime Pattern

The existing `GameEngine` becomes a `RoomAggregate`. Every mutation is a command:

```ts
type RoomCommand =
  | { type: "JoinRoom"; commandId: string; actorId: string; expectedVersion: number }
  | { type: "StartGame"; commandId: string; actorId: string; expectedVersion: number }
  | { type: "SubmitAnswer"; commandId: string; actorId: string; text: string; expectedVersion: number }
  | { type: "SubmitVote"; commandId: string; actorId: string; optionId: string; expectedVersion: number }
  | { type: "AdvancePhase"; commandId: string; expectedVersion: number };
```

- Redis stores the hot room snapshot with a TTL and processed command IDs.
- PostgreSQL stores room metadata and final results, not every typing event.
- Each room has a single-writer lease. A command with an old `expectedVersion` returns the latest public state.
- Socket.IO Redis adapter handles fan-out across API instances.
- Phase transitions use a delayed job plus an idempotent `AdvancePhase` command; timestamps remain authoritative if a job runs late.
- A snapshot is written after every accepted command. Closed rooms remain in Redis briefly for reconnect, then compact to PostgreSQL.
- Public state is generated per viewer. Correct answer, option author, private submission, and moderation data are separate server-only structures until reveal.

## 6. Authentication and Sessions

- Allow anonymous guest identity for immediate room play.
- Offer Sign in with Apple, Google, and email one-time code for recoverable accounts.
- A purchase screen requires account linking before checkout.
- Access JWT lifetime: 10 minutes. Rotating refresh session lifetime: 30 days with device-level revocation.
- Store refresh tokens in Secure Storage/Keychain on mobile and `HttpOnly`, `Secure`, `SameSite=Lax` cookies on web.
- Hash refresh tokens in PostgreSQL; never log access tokens, purchase tokens, OTPs, or full IP addresses.
- WebSocket connection authenticates once, then every command derives `actorId` from the socket session. Client-supplied `playerId` and `hostId` are removed from trusted command payloads.
- Account linking requires recent authentication and prevents merging two accounts that both own conflicting subscription identities without a support workflow.

## 7. Payments and Entitlements

### Provider contract

```ts
interface BillingProvider {
  verifyPurchase(input: VerifyPurchaseInput): Promise<NormalizedPurchase>;
  parseWebhook(headers: Headers, rawBody: Uint8Array): Promise<NormalizedPurchaseEvent>;
  acknowledge?(purchase: NormalizedPurchase): Promise<void>;
  revoke?(purchase: NormalizedPurchase): Promise<void>;
}
```

### Flow

1. Client requests a purchase intent for a known SKU and account.
2. Native client opens StoreKit/Play Billing; web client opens hosted Stripe/Paymob checkout.
3. Client sends the opaque receipt or purchase token to the API.
4. API verifies directly with the provider and checks SKU, environment, account binding, state, and replay.
5. One transaction inserts the purchase event, updates purchase state, grants entitlement, and writes an audit record.
6. API acknowledges the purchase only after entitlement commit.
7. Signed provider notifications update renewals, refunds, chargebacks, expiration, grace periods, and revocations.
8. `GET /v1/me/entitlements` is the only client authority for VIP, packs, and characters.

Apple and Google digital items use their native purchase systems. Web checkout uses hosted payment pages so AlHabeed never handles card data. Provider webhook signatures are verified against the unmodified raw request body. Event IDs and transaction IDs are unique keys, making retries harmless. A reconciliation job compares active subscriptions against provider state every 24 hours.

## 8. Content and Character Pipeline

- Build an admin CMS with roles `editor`, `reviewer`, `publisher`, `support`, and `admin`.
- Questions move through `draft -> fact_checked -> playtested -> published -> retired`.
- Every factual question requires source URL, reviewer, review timestamp, locale, difficulty, and content warnings.
- Duplicate detection normalizes Arabic letters, punctuation, whitespace, and numerals before similarity comparison.
- Media requires a digest and license record before publishing.
- Published packs are immutable versions. A match stores the selected version so edits cannot change a running game.
- The server selects online questions and sends only the current public prompt. Paid answers are not bundled into the public client.
- Character purchases unlock IDs; visual assets remain CDN-cacheable and signed ownership is never encoded only in the asset URL.

## 9. Security Controls

### Edge and transport

- HTTPS and WSS only; HSTS after production domains stabilize.
- Cloudflare WAF managed rules, bot controls on auth and room creation, and request body limits.
- Exact CORS allowlist for production, preview, and local origins; credentials never combine with wildcard origins.
- CSP restricts scripts, connections, frames, fonts, and images to required providers.

### API and WebSocket

- Validate every HTTP body, query, parameter, acknowledgement, and socket event with Zod.
- Rate limits by account plus privacy-preserving IP prefix: login 5/minute, room create 5/10 minutes, join 20/minute, answer/vote 5/phase.
- Normalize display names and answers; enforce grapheme length and reject control/bidi override characters.
- Use six-character room codes plus join throttling; private unlisted rooms never appear in searchable APIs.
- Authorize resource ownership on every command; never trust hidden buttons as access control.
- Add command IDs, expected versions, replay protection, maximum payload size, idle timeout, and connection caps.
- Admin endpoints require MFA/passkey, separate role claims, re-authentication for publishing/refunds, and immutable audit logs.

### Data and operations

- Secrets live in provider secret stores, separated by dev/staging/production and rotated.
- Encrypt provider tokens and sensitive support data at rest; database connections require TLS.
- Daily backups plus point-in-time recovery; quarterly restore drill with recorded recovery time.
- Dependency lockfiles, automated dependency review, secret scanning, SAST, container scanning, and SBOM on release.
- Logs redact tokens, answers before reveal, emails, payment payloads, and ad identifiers.
- Define retention: raw security logs 30 days, audit/payment records per accounting/legal requirements, abandoned guest profiles 90 days, closed live room data 24 hours.
- Provide account export and deletion; legal retention produces a tombstoned user rather than orphaning purchase records.

No client application can be made impossible to reverse engineer. Security relies on server authority, verified entitlements, short-lived data, rate limits, and monitoring rather than hiding keys or algorithms in JavaScript/mobile binaries.

## 10. Advertising and Privacy

- Represent consent as a versioned server record but let platform SDKs hold vendor-specific consent strings.
- Run Google UMP before requesting AdMob ads where required and expose “Privacy choices” permanently in settings.
- Request Apple ATT only when tracking is actually used, after a plain-language explanation; refusal keeps the game usable with contextual/non-personalized ads.
- Support an under-age mode that disables personalized advertising, behavioral analytics, open chat, and precise identifiers.
- Remote config controls placement enablement, frequency caps, minimum session age, and emergency ad shutdown.
- Reward grant is a server command keyed by ad verification transaction ID. Client callbacks alone do not grant value.
- Analytics events use pseudonymous user IDs and a documented event allowlist; arbitrary text answers never enter analytics.

## 11. Observability and Reliability

### Service objectives

- API availability: 99.9% monthly.
- Successful room command latency: p95 under 250 ms in the primary region.
- Reconnect to current state: p95 under 3 seconds.
- Verified purchase to entitlement: p95 under 10 seconds, with webhook reconciliation fallback.
- Crash-free mobile sessions: at least 99.5% before public marketing spend.

### Required signals

- Structured logs with request ID, room hash, command ID, module, duration, and result.
- Metrics for active rooms, sockets, reconnects, command conflicts, timer delay, provider verification, webhook lag, ad fill, and consent state.
- Distributed traces across API, Redis, PostgreSQL, and payment verification.
- Alerts on error-rate burn, Redis saturation, database connections, phase-transition lag, webhook failure, and abnormal entitlement grants.
- Runbooks for provider outage, Redis loss, database failover, fraudulent purchase spike, leaked secret, and content takedown.

## 12. Delivery Phases

### Phase 0: Stabilize contracts and repository boundaries

**Files:** move `client/` to `apps/web/`; move `src/server/` to `apps/api/`; move `src/core/` to `packages/game-domain/`; create `packages/contracts/`.

- [ ] Add npm workspaces and shared TypeScript configuration.
- [ ] Define Zod schemas for every HTTP and socket command and infer TypeScript DTOs from them.
- [ ] Convert client-supplied player/host IDs to authenticated server session identity.
- [ ] Add state-machine tests proving answers/authors remain secret until reveal and duplicate commands are idempotent.
- [ ] Commit as `refactor: establish production domain boundaries`.

**Exit gate:** existing local and online game flows pass using shared contracts; no production feature is tied to `App.tsx` state alone.

### Phase 1: Accounts, PostgreSQL and recoverable sessions

**Files:** create `packages/identity/`, `apps/api/src/modules/identity.ts`, `infra/migrations/0001_identity.sql`; modify web session storage.

- [ ] Add guest creation, Google/Apple identity exchange, email OTP, token rotation, logout-all-devices, and account deletion.
- [ ] Add PostgreSQL repositories and migrations for identity/profile/session tables.
- [ ] Store mobile refresh tokens in native secure storage and web refresh sessions in secure cookies.
- [ ] Test stolen/reused refresh tokens, account-link conflicts, expiry, and deletion.
- [ ] Commit as `feat: add recoverable accounts and secure sessions`.

**Exit gate:** a guest can play, link an account, reinstall, sign in, and recover the same profile.

### Phase 2: Durable authoritative multiplayer

**Files:** create Redis repository and lease/job adapters in `apps/api/src/modules/rooms/`; modify `packages/game-domain/` command interface.

- [ ] Implement versioned commands, Redis room snapshots, processed-command cache, and single-writer leases.
- [ ] Add Socket.IO Redis adapter and delayed phase transitions.
- [ ] Persist closed match summaries to PostgreSQL.
- [ ] Test reconnect, API restart, duplicate vote, late timer, two API replicas, and Redis recovery.
- [ ] Load test 1,000 concurrent sockets and 100 active rooms before raising limits.
- [ ] Commit as `feat: make multiplayer durable and horizontally safe`.

**Exit gate:** killing one API replica does not lose a room or double-score a command.

### Phase 3: Catalog, CMS, packs and characters

**Files:** create `packages/catalog/`, `apps/web/src/admin/`, catalog migrations, R2 asset adapter, and content source manifests.

- [ ] Implement product/pack/question/character schemas and versioned publishing workflow.
- [ ] Import the current 470 local questions with provenance/review state; only reviewed content becomes online production content.
- [ ] Add media licensing validation and Arabic duplicate detection.
- [ ] Build editor/reviewer/publisher screens with RBAC and audit events.
- [ ] Serve pack manifests and current prompts according to entitlement and room selection.
- [ ] Commit as `feat: add versioned catalog and moderated content pipeline`.

**Exit gate:** a reviewer can publish a pack version and a running match remains pinned to that version.

### Phase 4: Billing and VIP

**Files:** create `packages/billing/`, native billing bridges, webhook routes, billing migrations, entitlement middleware.

- [ ] Define stable SKUs and platform product mapping.
- [ ] Implement StoreKit 2, Google Play Billing, and hosted web checkout adapters.
- [ ] Verify receipts/tokens server-side, persist immutable events, and grant entitlement transactionally.
- [ ] Handle pending, renewal, grace, expiration, refund, chargeback, revoke, restore, and duplicate webhook states.
- [ ] Add entitlement checks to packs, characters, VIP host controls, and ad removal.
- [ ] Test sandbox purchases and provider-signed notifications for all lifecycle states.
- [ ] Commit as `feat: add verified purchases and entitlement ledger`.

**Exit gate:** no mocked/client-forged purchase grants access; restore purchases works after reinstall.

### Phase 5: Ads, consent and privacy controls

**Files:** create mobile ad/consent bridges, `packages/contracts/src/ads.ts`, privacy settings UI, server-side rewarded-ad verification.

- [ ] Add UMP consent refresh at launch and a permanent privacy choices entry point.
- [ ] Add ATT flow only for configurations that track.
- [ ] Implement banner, post-match interstitial, rewarded pack trial, VIP suppression, and remote kill switch.
- [ ] Add frequency-cap and rewarded-transaction tests.
- [ ] Verify child/under-age and denied-consent paths produce no personalized requests.
- [ ] Commit as `feat: add consent-aware responsible advertising`.

**Exit gate:** ads cannot appear inside a round and VIP/under-age behavior is enforced from authoritative configuration.

### Phase 6: Mobile packaging and store readiness

**Files:** create Capacitor iOS/Android projects, platform manifests, privacy manifests, deep-link configuration, store metadata.

- [ ] Configure universal/app links for room invites with safe fallback to web.
- [ ] Add push notification permission only after a user-visible reason and feature trigger.
- [ ] Configure app signing, environment-specific bundle IDs, secure storage, icons, splash screens, and privacy disclosures.
- [ ] Test low-memory resume, offline launch, interrupted purchase, background reconnect, RTL layout, screen reader, and small devices.
- [ ] Submit mobile products with clear digital purchase descriptions and restore flow.
- [ ] Commit as `feat: package production mobile applications`.

**Exit gate:** TestFlight and Play internal testing pass account, purchase, restore, ad-consent, room-invite, and deletion scenarios.

### Phase 7: Security, load and launch gate

**Files:** infrastructure policies, CSP/WAF config, threat model, runbooks, dashboards, incident templates.

- [ ] Threat-model identity, room enumeration, answer leakage, payment replay, admin compromise, UGC abuse, and provider outage.
- [ ] Run dependency/secret/SAST scans and fix high/critical findings.
- [ ] Run API authorization tests, WebSocket fuzz/payload tests, and payment replay tests.
- [ ] Restore a production-like backup into an isolated environment and record RPO/RTO.
- [ ] Run staged load tests and verify SLO dashboards/alerts.
- [ ] Complete store privacy labels, terms, privacy policy, moderation/reporting, and support flows with legal review.
- [ ] Commit as `chore: complete production launch hardening`.

**Exit gate:** zero open critical/high security findings, verified restore, passing store sandbox payments, and successful incident drill.

## 13. Recommended Delivery Order and Estimate

| Milestone | Includes | One strong developer with agent support |
|---|---|---|
| Production multiplayer alpha | Phases 0–2 | 3–5 weeks |
| Content/store beta | Phase 3 | 2–3 weeks |
| VIP and payments beta | Phase 4 | 2–4 weeks |
| Ads and mobile beta | Phases 5–6 | 3–5 weeks |
| Hardening and store launch | Phase 7 | 2–3 weeks plus store review |

Parallel design/content work can shorten calendar time, but payment review, mobile signing, policy setup, and load/security validation cannot safely be compressed into a cosmetic implementation pass.

## 14. Architecture Decisions to Lock Now

1. Keep the current TypeScript/React/Fastify foundation and package it with Capacitor.
2. Use Neon PostgreSQL for durable records, Railway Redis for hot room state, Railway for API/worker, and Cloudflare Pages/R2/CDN for web/assets.
3. Build a modular monolith first; extract the room actor or billing worker only after measurements justify it.
4. Use native platform billing for mobile digital goods and hosted checkout for web.
5. Launch VIP plus non-consumable packs/characters; defer coins and randomized purchases.
6. Allow free guests to play, but require linked accounts for purchases and recovery.
7. Treat question secrecy and entitlement as server responsibilities; never depend on obfuscated frontend files.

## 15. Self-Review Result

- Coverage includes accounts, multiplayer, VIP, packs, characters, advertisements, payment providers, CMS, content licensing, anti-cheat, security, privacy, observability, mobile packaging, and launch operations.
- Interfaces use consistent `RoomCommand`, `BillingProvider`, purchase ledger, and entitlement terminology.
- Each phase has an independently verifiable exit gate and commit boundary.
- The design avoids premature microservices, client-authoritative purchases, ads during rounds, and unverifiable content ownership.

## 16. Execution Progress — 2026-09-08

Implemented locally on `feat/production-foundation` without deployment:

- Strict Zod socket/HTTP payload boundaries and server-derived room actor identity.
- Signed guest reconnect sessions, command IDs, optimistic room versions and retry deduplication.
- Exact CORS policy, request/socket size limits, throttling, CSP and security headers.
- PostgreSQL room repository plus identity, billing, catalog, consent, moderation and audit migrations.
- Rotating hashed refresh sessions with reuse-family revocation.
- Immutable purchase/entitlement domain, ad placement policy and verified rewarded-trial ledger.
- Catalog review/publish workflow, Arabic duplicate normalization and media-license validation.
- Redis room snapshots, leases and Socket.IO fan-out adapter.
- Production config gate, readiness, redacted logging, protected aggregate metrics and incident runbooks.

Remaining release-critical integrations require provisioned environments: provider login, native StoreKit/Play Billing, hosted web checkout, provider-signed webhook fixtures, Redis transaction integration for processed commands, Capacitor native projects, WAF/R2 setup, load testing and store review.
