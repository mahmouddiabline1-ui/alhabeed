# AlHabeed Threat Model

Last reviewed: 2026-09-08

## Assets and trust boundaries

- Private round data: correct answers, answer authors, votes before reveal.
- Identity: account links, refresh sessions, guest reconnect tokens.
- Commerce: provider receipts, immutable purchase events, entitlements and refunds.
- Content: reviewed questions, licensed media and published pack versions.
- Administration: publishing, moderation, refunds and role grants.

The browser and mobile binaries are untrusted. Provider callbacks, HTTP requests and Socket.IO packets cross a trust boundary. PostgreSQL, Redis and provider credentials are server-only.

## Highest-risk abuse cases

| Threat | Required control | Verification |
|---|---|---|
| Fake player/host ID | Actor derived from signed socket session | Contract and engine tests |
| Duplicate vote or network retry | Command ID, expected room version, processed-command gate | `commandGate.test.ts` |
| Correct-answer extraction | Per-viewer public projection; answer/author withheld until reveal | `gameEngine.test.ts` |
| Room-code enumeration | Six-character codes, no directory endpoint, join/create throttles | Socket/API limits |
| Oversized or bidi payload | 16 KiB transport limit and strict Zod text schemas | Contract boundary |
| Stolen refresh token | Hash at rest, one-time rotation, family revocation on reuse | `sessions.test.ts` |
| Forged VIP/purchase | Direct provider verification before immutable ledger update | Billing adapter contract |
| Webhook replay | Unique provider event and transaction IDs | `billing.test.ts` + DB constraints |
| Unlicensed card image | Digest, source and license required before publish | `catalog.test.ts` |
| Compromised support account | Least privilege; MFA/re-auth for sensitive actions | `authorization.test.ts` |
| Ad shown during a round | Server-owned placement policy | `ads.test.ts` |
| Secret or answer leakage in logs | Logger redaction and aggregate-only metrics | Production config review |

## Residual risks before launch

- Apple, Google and web checkout adapters still require provider sandbox integration and signature fixtures.
- Distributed command IDs must move from process memory into the Redis room transaction before horizontal load testing.
- Admin MFA/passkey enrollment and account recovery require end-to-end implementation.
- WAF rules, backups, restore evidence, mobile privacy manifests and store disclosures require configured provider environments.
- Factual content and real-world imagery require human review of source and license records; generation alone is not evidence.

## Release blocking conditions

- Any path returns `correctAnswer`, `isCorrect`, `authorId`, private submissions or unrevealed votes early.
- Any client callback can grant VIP, a pack, a character or rewarded-ad value without server verification.
- Production can start with an ephemeral session secret, wildcard CORS, missing PostgreSQL or missing Redis.
- High/critical dependency, authorization, secret-scan or payment-replay findings remain open.
