# AlHabeed Social Game Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first “AlHabeed World” platform increment: a production-ready game hub, a horizontally correct versioned room runtime, and a deterministic local vertical slice of the original district race-board game.

**Architecture:** Evolve the existing React/Vite, Fastify, Socket.IO, Redis and PostgreSQL modular monolith in place. The hub is delivered without changing the current AlHabeed protocol; Room Runtime v2 then introduces shared room ownership and versioned game adapters behind backward-compatible events; the race-board engine is a pure shared package consumed by a pass-and-play React client before any online adapter is built.

**Tech Stack:** TypeScript 5, React, Vite, React Router, Vitest, Testing Library, Fastify, Socket.IO, Redis Lua/CAS, PostgreSQL/Neon, Node test runner, Zod, npm workspaces.

## Global Constraints

- AlHabeed remains the primary brand and the dominant playable game on the hub.
- The first release is a Web/PWA release; native iOS/Android background voice is out of scope.
- Cloudflare Pages is the canonical frontend and Railway is the API/realtime host.
- Railway stays at exactly one API replica until the Room Runtime v2 production gate passes.
- Existing create, join, reconnect, local play, profile, history and statistics behavior must not regress.
- Shared rooms own membership, presence, host controls, reconnect, protocol version and future voice authorization.
- Each game owns rules, commands, public-state projection and result mapping.
- Public projections never contain account IDs, hidden answers, raw votes, voice credentials or provider secrets.
- Cached clients with an unsupported protocol receive an explicit upgrade error and cannot mutate a room.
- Hub motion supports `prefers-reduced-motion`, has a low-power fallback and avoids continuous GPU-heavy animation.
- The hub has no horizontal overflow at 360, 768, 1024 and 1440 CSS pixels.
- New names, board/card layouts, token silhouettes, icons, characters, sounds, copy and animation are original.
- Every production asset has creator or generation method, source or prompt, license, creation date and SHA-256 digest recorded in the asset manifest.
- Online clients never declare a random draw, legal move or winner.
- New functionality is developed test-first. Each task ends with its focused tests plus the relevant build.

---

## Scope and follow-on boundaries

This plan is executable through the first local race-board release. The following approved product phases are deliberately separate plans because they have independent architecture, security and product decisions:

| Follow-on plan | Starts only after | Required scope |
|---|---|---|
| `docs/superpowers/plans/2026-09-13-district-race-online.md` | Race Local Gate and Room Runtime v2 Gate | Authoritative randomness/moves, timers, reconnect, public projections and exactly-once results |
| `docs/superpowers/plans/2026-09-13-livekit-room-voice-pilot.md` | Recoverable identity and online race room membership | LiveKit SFU/TURN, authenticated speakers, short-lived tokens, mute/push-to-talk, moderation, device recovery, no recording/transcription |
| `docs/superpowers/plans/2026-09-13-original-chess.md` | Asset provenance and runtime adapter stable | Rules-library license review, original pieces/board/sound, local and online adapters |
| `docs/superpowers/plans/2026-09-13-original-shedding-game.md` | A separately accepted exact rules specification | Original deck taxonomy, actions, terminology, icons and presentation; no UNO name, deck, copy or trade dress |

Creating these follow-on plans is not an acceptance requirement for this plan. Their prerequisite seams are acceptance requirements and are named explicitly below.

## Baseline to preserve

- Current production commit at plan creation: `54d8f49`.
- Current frontend entry: `client/src/App.tsx`; hash/query routing is hand-written.
- Current online engine: `src/core/engine.ts`; public filtering is covered by `tests/engine.test.ts`.
- Current Socket.IO composition: `src/server/index.ts`.
- Current Redis storage: `src/persistence/redisRoomRepository.ts`; it stores snapshots but does not atomically deduplicate commands.
- Current process-local deduplication: `src/server/commandGate.ts`.
- Current result model: `src/results/types.ts` and migration `infra/migrations/0007_game_result_history.sql`.
- Current production content: 36 categories and 862 published questions.

## Agent ownership and review protocol

Implementation is sequential at shared-file boundaries. Workers are not alone in the repository: they must preserve unrelated edits, never revert another worker’s changes, and stop if a listed shared file has changed since their task began.

| Ownership lane | Files owned while its task is active | Files it must not change |
|---|---|---|
| Hub foundation agent | `client/src/platform/**`, client test configuration, route composition in `client/src/App.tsx` | Backend runtime, database migrations, existing game rules |
| Hub visual/asset agent | `client/src/platform/hub/**`, `client/src/platform/hub.css`, hub-specific public assets, asset manifest tooling | Socket events, identity logic, AlHabeed engine |
| Contracts agent | `packages/contracts/**`, workspace/build manifests, protocol schemas | Redis algorithms, hub appearance, game rules |
| Room kernel agent | `src/rooms/**`, `src/games/alhabeed/**`, compatibility facade in `src/core/**` | Client visual design, race rules |
| Redis runtime agent | `src/persistence/redisRoomRepository.ts`, `src/rooms/roomCoordinator.ts`, Redis integration scripts/tests | AlHabeed scoring and public projection semantics |
| Server integration agent | `src/server/index.ts`, result repositories/types, migration `0008` | Hub styling, race engine |
| Race-domain agent | `packages/district-race-domain/**` | React components, Socket.IO, persistence |
| Race-UI agent | `client/src/games/districtRace/**`, registry availability change, race-specific CSS/assets | Server runtime and race-domain rules |
| Sol reviewer | Read-only inspection, test evidence and review notes | Production implementation files |

Every task gets a focused implementation review. Every phase ends with a Sol gate. A Sol gate checks spec compliance, security/copyright constraints, regression evidence and diff scope; it does not replace the worker’s tests.

## Dependency order

```text
Hub 1 test harness/registry
  -> Hub 2 routing/shell
  -> Hub 3 AlHabeed extraction
  -> Hub 4 visual hub/assets
  -> Hub 5 canonical deployment and release gate

Runtime 1 shared contracts/workspaces
  -> Runtime 2 shared room kernel + AlHabeed adapter
  -> Runtime 3 atomic repositories
  -> Runtime 4 owned deadlines
  -> Runtime 5 server compatibility/results
  -> Runtime 6 staging and production gate

Race 1 exact v1 rules fixtures
  -> Race 2 deterministic engine
  -> Race 3 powers and simulation
  -> Race 4 pass-and-play UI/assets
  -> Race 5 hub integration and release gate
```

---

# Phase 1 — Platform Hub v1

Hub v1 is the first production shipment. It does not modify backend room state, Socket.IO payloads, authentication or database schema.

### Task 1: Add client tests and the typed game registry

**Owner:** Hub foundation agent

**Files:**
- Modify: `client/package.json`
- Modify: `client/package-lock.json`
- Modify: `client/tsconfig.json`
- Create: `client/vitest.config.ts`
- Create: `client/src/test/setup.ts`
- Create: `client/src/platform/gameRegistry.ts`
- Test: `client/src/platform/gameRegistry.test.ts`

**Dependencies:** None.

**Interfaces:**
- Produces `GameId`, `GameAvailability`, `GameDefinition`, `GAME_REGISTRY` and `gameById(id)`.
- The only playable entries in this phase are AlHabeed local and AlHabeed online.

- [ ] **Step 1: Add the client test dependencies and script**

Run:

```powershell
npm install --prefix client --save-dev vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Add `"test": "vitest run"` to `client/package.json`. Configure `vitest.config.ts` with the React plugin, `environment: "jsdom"`, `setupFiles: ["./src/test/setup.ts"]`, and CSS enabled. Import `@testing-library/jest-dom/vitest` from the setup file.

Expected: `client/package-lock.json` pins the installed versions and `npm --prefix client test -- --passWithNoTests` exits 0.

- [ ] **Step 2: Write the failing registry tests**

Cover the stable IDs, unique slugs, player ranges, current availability and route rules:

```ts
expect(GAME_REGISTRY.map(game => game.id)).toEqual([
  "alhabeed",
  "district-race",
  "chess",
  "shedding",
]);
expect(GAME_REGISTRY.filter(game => game.availability.online === "playable").map(game => game.id)).toEqual(["alhabeed"]);
expect(GAME_REGISTRY.filter(game => game.availability.local === "playable").map(game => game.id)).toEqual(["alhabeed"]);
expect(new Set(GAME_REGISTRY.map(game => game.slug)).size).toBe(GAME_REGISTRY.length);
expect(() => gameById("unknown" as GameId)).toThrow("Unknown game: unknown");
```

Run: `npm --prefix client test -- gameRegistry.test.ts`

Expected: FAIL because `gameRegistry.ts` does not exist.

- [ ] **Step 3: Implement the exact registry surface**

Use these types:

```ts
export type GameId = "alhabeed" | "district-race" | "chess" | "shedding";
export type ReleaseStatus = "playable" | "coming-soon";
export interface GameDefinition {
  id: GameId;
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  playerCount: { min: number; max: number; label: string };
  availability: { local: ReleaseStatus; online: ReleaseStatus };
  routes: { overview: string; local?: string; online?: string };
  accent: string;
  coverAssetId: string;
}
```

Use `سباق اللِّمّة` as the race-board working display name, `الشطرنج` for chess and `ورق اللِّمّة` for the shedding-game working display name. Coming-soon cards must not expose active play routes.

- [ ] **Step 4: Run focused tests and build**

Run:

```powershell
npm --prefix client test -- gameRegistry.test.ts
npm --prefix client run build
```

Expected: registry tests pass and Vite completes without TypeScript errors.

- [ ] **Step 5: Commit the task**

```powershell
git add client/package.json client/package-lock.json client/tsconfig.json client/vitest.config.ts client/src/test client/src/platform/gameRegistry.ts client/src/platform/gameRegistry.test.ts
git commit -m "feat: add typed platform game registry"
```

### Task 2: Replace ad-hoc screen parsing with a hash-routed platform shell

**Owner:** Hub foundation agent

**Files:**
- Modify: `client/package.json`
- Modify: `client/package-lock.json`
- Modify: `client/src/main.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/BottomNav.tsx`
- Create: `client/src/platform/AppShell.tsx`
- Create: `client/src/platform/routes.tsx`
- Create: `client/src/platform/LegacyInviteRedirect.tsx`
- Test: `client/src/platform/routes.test.tsx`

**Dependencies:** Task 1.

**Interfaces:**
- Consumes `GAME_REGISTRY` route values.
- Produces stable routes `/`, `/games/alhabeed/local`, `/games/alhabeed/create`, `/games/alhabeed/join`, `/room/:code`, `/news` and `/notifications` under `HashRouter`.
- Preserves legacy `?room=ABC123` invites by replacing the hash with `/room/ABC123`.

- [ ] **Step 1: Install the routing dependency**

Run: `npm install --prefix client react-router-dom`

Expected: `react-router-dom` is in dependencies and the lockfile is updated.

- [ ] **Step 2: Write failing route tests**

Use `MemoryRouter`, render `AppRoutes` with lightweight route-element overrides, and assert:

```ts
expect(screen.getByTestId("route")).toHaveTextContent("hub");
// initialEntries: ["/games/alhabeed/local"] -> "local"
// initialEntries: ["/room/A1B2C3"] -> "room:A1B2C3"
// query string ?room=A1B2C3 is normalized to /room/A1B2C3
```

Also assert that bottom-nav links use router anchors and `aria-current="page"`, not manually mutated history state.

Run: `npm --prefix client test -- routes.test.tsx`

Expected: FAIL because `AppRoutes` and the shell do not exist.

- [ ] **Step 3: Implement route composition**

`AppShell` owns the persistent navigation and profile panel slot. `AppRoutes` accepts this testable interface:

```ts
export interface RouteElements {
  hub: ReactNode;
  localAlHabeed: ReactNode;
  createAlHabeed: ReactNode;
  joinAlHabeed: ReactNode;
  roomAlHabeed: (code: string) => ReactNode;
  news: ReactNode;
  notifications: ReactNode;
}
export function AppRoutes({ elements }: { elements: RouteElements }): JSX.Element;
```

`main.tsx` supplies `HashRouter`. Do not use `BrowserRouter`; Cloudflare and the legacy GitHub subpath must not require server-side route rewrites.

- [ ] **Step 4: Preserve legacy invite behavior**

`LegacyInviteRedirect` validates room codes with `/^[A-Z0-9]{6}$/u`, uses `navigate("/room/" + code, { replace: true })`, and removes the legacy query parameter. Invalid query codes return to the hub with a visible Arabic error rather than emitting a socket event.

- [ ] **Step 5: Run route, client build and existing backend tests**

Run:

```powershell
npm --prefix client test -- routes.test.tsx
npm --prefix client run build
npm test
```

Expected: all commands pass; backend tests demonstrate that no protocol behavior changed.

- [ ] **Step 6: Commit the task**

```powershell
git add client/package.json client/package-lock.json client/src/main.tsx client/src/App.tsx client/src/BottomNav.tsx client/src/platform
git commit -m "refactor: establish platform shell routes"
```

### Task 3: Extract the existing AlHabeed client behind a feature boundary

**Owner:** Hub foundation agent

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/types.ts`
- Move: online game UI and socket orchestration from `client/src/App.tsx` to `client/src/games/alhabeed/AlHabeedOnline.tsx`
- Move: `client/src/LocalGame.tsx` to `client/src/games/alhabeed/AlHabeedLocal.tsx`
- Create: `client/src/games/alhabeed/socket.ts`
- Create: `client/src/games/alhabeed/session.ts`
- Create: `client/src/games/alhabeed/index.ts`
- Test: `client/src/games/alhabeed/session.test.ts`

**Dependencies:** Task 2.

**Interfaces:**
- Produces `AlHabeedOnline`, `AlHabeedLocal`, `readAlHabeedSession`, `saveAlHabeedSession` and `clearAlHabeedSession`.
- Retains storage key `alhabeed:session` and current Socket.IO event names/payloads.
- `App.tsx` becomes route composition only; it must not contain game phases, room commands or Socket.IO imports.

- [ ] **Step 1: Write failing session compatibility tests**

Test reading the current storage payload, rejecting malformed JSON and preserving reconnect tokens:

```ts
const current = { code: "A1B2C3", playerId: "p1", name: "محمود", token: "signed-token" };
localStorage.setItem("alhabeed:session", JSON.stringify(current));
expect(readAlHabeedSession()).toEqual(current);
localStorage.setItem("alhabeed:session", "{");
expect(readAlHabeedSession()).toBeNull();
```

Run: `npm --prefix client test -- session.test.ts`

Expected: FAIL because the extracted module does not exist.

- [ ] **Step 2: Extract session and socket ownership without behavior changes**

`socket.ts` exports `getAlHabeedSocket()` and constructs at most one socket. It retains `autoConnect: false`, `serverUrl`, access-token authentication and existing event names. `session.ts` performs all access to `alhabeed:session`.

- [ ] **Step 3: Move components mechanically**

Move `Home` create/join forms, `Lobby`, `AnswerPhase`, `VotePhase`, `Reveal`, `Finished`, shared setting fields and their helpers into `AlHabeedOnline.tsx`. Move the local component without changing its phase model, persistence key, question-fetching behavior or Arabic copy. Update asset URLs to use `import.meta.env.BASE_URL` so both root and subpath deployments work.

- [ ] **Step 4: Make `App.tsx` composition-only**

`App.tsx` constructs route elements and platform-level profile state. It may pass the current profile/access-token callbacks to the AlHabeed feature, but no game command or round state remains in the file.

- [ ] **Step 5: Run all regression checks**

Run:

```powershell
npm --prefix client test
npm --prefix client run build
npm test
```

Expected: all tests/builds pass. The generated bundle still contains `room:create`, `room:join`, `room:reconnect`, `round:answer` and `round:vote`.

- [ ] **Step 6: Commit the task**

```powershell
git add client/src/App.tsx client/src/types.ts client/src/games client/src/LocalGame.tsx
git commit -m "refactor: isolate AlHabeed client feature"
```

### Task 4: Build the original responsive hub and asset-provenance gate

**Owner:** Hub visual/asset agent

**Files:**
- Create: `client/src/platform/hub/HubPage.tsx`
- Create: `client/src/platform/hub/GameCard.tsx`
- Create: `client/src/platform/hub/MotionBackdrop.tsx`
- Create: `client/src/platform/hub/useMotionPreference.ts`
- Create: `client/src/platform/hub/index.ts`
- Create: `client/src/platform/hub.css`
- Modify: `client/src/App.tsx`
- Modify: `client/src/styles.css`
- Modify: `client/src/brand.css`
- Create: `client/public/games/district-race-cover.svg`
- Create: `client/public/games/chess-cover.svg`
- Create: `client/public/games/shedding-cover.svg`
- Create: `content/assets.manifest.json`
- Create: `src/content/assetManifest.ts`
- Create: `scripts/verifyAssetManifest.ts`
- Test: `client/src/platform/hub/HubPage.test.tsx`
- Test: `tests/assetManifest.test.ts`
- Modify: `package.json`

**Dependencies:** Tasks 1–3.

**Interfaces:**
- Consumes `GAME_REGISTRY` and route links.
- Produces a dominant AlHabeed card plus a secondary “ألعاب اللِّمّة” collection.
- Produces `validateAssetManifest(raw, production)`; production rejects missing files, digest mismatches, unverified licenses and missing creator/source metadata.

- [ ] **Step 1: Write failing hub behavior tests**

Assert that the AlHabeed card is first, has working local/online actions, and that coming-soon cards have no playable links:

```ts
expect(screen.getAllByTestId("game-card")[0]).toHaveAttribute("data-game-id", "alhabeed");
expect(screen.getByRole("link", { name: /العب أونلاين/u })).toHaveAttribute("href", "/games/alhabeed/create");
expect(screen.getByTestId("game-card-district-race")).toHaveTextContent("قريبًا");
expect(within(screen.getByTestId("game-card-district-race")).queryByRole("link")).toBeNull();
```

Run: `npm --prefix client test -- HubPage.test.tsx`

Expected: FAIL because the hub components do not exist.

- [ ] **Step 2: Write failing provenance tests**

The manifest entry shape is:

```ts
interface AssetManifestEntry {
  id: string;
  path: string;
  creatorOrMethod: string;
  sourceOrPrompt: string;
  license: "owned" | "cc0" | "cc-by" | "licensed" | "unverified";
  createdAt: string;
  sha256: string;
  productionUse: boolean;
}
```

Test unique IDs/paths, ISO dates, 64-character lower-case digests, real-file digest equality, attribution for `cc-by`, HTTPS source for third-party licenses, and rejection of `productionUse: true` with `unverified`.

Run: `npm test -- --test-name-pattern="asset manifest"`

Expected: FAIL because the validator and manifest do not exist.

- [ ] **Step 3: Create original lightweight covers**

Create SVG covers using only original geometric shapes, the approved orange/navy/cream/yellow foundation and distinct per-game accents. Do not recreate a cross-shaped race board, branded card back, copied token silhouette or third-party chess piece set. The race teaser uses a curved neighborhood loop and central gathering-stage motif; chess and shedding remain abstract teasers rather than final game art.

For every created asset, calculate the digest with:

```powershell
Get-FileHash client/public/games/*.svg -Algorithm SHA256
```

Record truthful creator/method and source/prompt text in `content/assets.manifest.json`. Existing logo/character/card assets referenced by the hub must either receive verified entries based on owner-supplied provenance or be excluded from the hub.

- [ ] **Step 4: Implement the visual hierarchy and motion fallback**

Use semantic headings, real links, visible focus states, 44 px minimum controls and RTL-aware layouts. `useMotionPreference` returns `"reduced"` when `matchMedia("(prefers-reduced-motion: reduce)").matches` and `"low-power"` when `navigator.hardwareConcurrency <= 4` or `navigator.connection?.saveData === true`; otherwise it returns `"full"`. Reduced and low-power modes render a static backdrop and disable card parallax.

- [ ] **Step 5: Add the production provenance command**

Add `"assets:verify": "tsx scripts/verifyAssetManifest.ts"` and include it in `check`. The script calls `validateAssetManifest` with `production = true`, prints the validated asset count and exits nonzero on the first invalid production entry.

- [ ] **Step 6: Run focused and full checks**

Run:

```powershell
npm --prefix client test -- HubPage.test.tsx
npm run assets:verify
npm run check
```

Expected: all pass; asset verification reports the exact count of `productionUse: true` entries.

- [ ] **Step 7: Commit the task**

```powershell
git add client/src/platform/hub client/src/platform/hub.css client/src/App.tsx client/src/styles.css client/src/brand.css client/public/games content/assets.manifest.json src/content/assetManifest.ts scripts/verifyAssetManifest.ts tests/assetManifest.test.ts package.json package-lock.json
git commit -m "feat: add original AlHabeed World hub"
```

### Task 5: Make Cloudflare canonical and perform the Hub v1 release gate

**Owner:** Hub foundation agent for configuration; Sol reviewer for the gate

**Files:**
- Modify: `wrangler.jsonc`
- Create: `client/public/_headers`
- Modify: `client/src/serverUrl.ts`
- Modify: `.github/workflows/pages.yml`
- Modify: `README.md`
- Create: `docs/runbooks/frontend-canonical-origin.md`

**Dependencies:** Task 4.

**Interfaces:**
- Produces one documented canonical frontend origin, Cloudflare Pages deployment instructions and safe static security headers.
- GitHub Pages workflow remains build-only/manual rollback validation and does not advertise itself as production.

- [ ] **Step 1: Add Cloudflare static headers**

Configure `/client/public/_headers` with CSP permitting only self-hosted scripts/styles/images plus Railway `connect-src`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, and a PWA-compatible permissions policy. Do not enable microphone in Hub v1; the later voice plan changes that policy deliberately.

- [ ] **Step 2: Document and encode the canonical origin**

The runbook states:

```text
Canonical frontend: https://alhabeed.pages.dev until a verified custom domain replaces it.
API/realtime: https://alhabeed-production.up.railway.app
GitHub Pages: non-canonical rollback preview only.
```

Document the matching Railway `ALLOWED_ORIGINS` entry and the cache-purge/rollback procedure. Keep `VITE_SERVER_URL` overridable for preview builds.

- [ ] **Step 3: Stop automatic GitHub Pages production publication**

Change `pages.yml` to `workflow_dispatch` only, rename its environment to `github-pages-preview`, and preserve the build as a rollback check. Do not delete the workflow until Cloudflare deployment ownership is visible in the repository or dashboard.

- [ ] **Step 4: Run local release checks**

Run:

```powershell
npm run check
npm run assets:verify
git diff --check
git status --short
```

Expected: tests/builds pass, no whitespace errors, and only task-owned files are modified.

- [ ] **Step 5: Perform one browser acceptance pass**

Open the built hub once and inspect responsive modes at 360, 768, 1024 and 1440 px. Record one screenshot sheet containing all four widths. At each width verify `document.documentElement.scrollWidth === document.documentElement.clientWidth`, the flagship card appears first, coming-soon cards have no active play control, keyboard focus is visible, and reduced-motion mode has no continuously animated layer.

- [ ] **Step 6: Sol Hub Gate**

Sol reviews the diff and evidence. Reject the gate if any backend protocol changed, if a production asset lacks provenance, if either frontend is still described as co-canonical, or if existing AlHabeed paths fail. Approval authorizes deployment to Cloudflare Pages but not Room Runtime v2.

- [ ] **Step 7: Commit and deploy Hub v1**

```powershell
git add wrangler.jsonc client/public/_headers client/src/serverUrl.ts .github/workflows/pages.yml README.md docs/runbooks/frontend-canonical-origin.md
git commit -m "ops: make Cloudflare the canonical game hub"
git push origin HEAD:main
```

Post-deploy acceptance: Cloudflare returns the new hub; Railway `/health` and `/ready` remain healthy; a three-player AlHabeed create/join/reconnect smoke completes; profile/history/stats still load.

---

# Phase 2 — Room Runtime v2

This phase changes authoritative state. It ships behind protocol v2 while v1 events remain compatible for one cached-PWA window. No new online game is enabled until the phase gate passes.

### Task 6: Establish workspaces and shared protocol contracts

**Owner:** Contracts agent

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Delete after root lockfile is verified: `client/package-lock.json`
- Modify: `.github/workflows/pages.yml`
- Modify: `railway.json`
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/src/index.ts`
- Create: `packages/contracts/src/games.ts`
- Create: `packages/contracts/src/rooms.ts`
- Create: `packages/contracts/src/errors.ts`
- Modify: `client/package.json`
- Modify: `client/src/platform/gameRegistry.ts`
- Modify: `src/contracts/events.ts`
- Test: `tests/platformContracts.test.ts`

**Dependencies:** Hub v1 deployed.

**Interfaces:**
- Produces package `@alhabeed/contracts`.
- Produces `GameId`, `PROTOCOL_VERSION = 2`, `RoomMember`, `RoomEnvelope<TGame>`, `RoomCommandEnvelope<TPayload>` and `UNSUPPORTED_PROTOCOL` error shape.

- [ ] **Step 1: Write failing contract tests**

Test strict parsing, v2 acceptance and v1/v3 rejection:

```ts
assert.equal(PROTOCOL_VERSION, 2);
assert.equal(roomCommandEnvelopeSchema.parse({
  protocolVersion: 2,
  gameId: "alhabeed",
  roomCode: "A1B2C3",
  commandId: "00000000-0000-4000-8000-000000000001",
  expectedVersion: 7,
  payload: {},
}).gameId, "alhabeed");
assert.throws(() => roomCommandEnvelopeSchema.parse({ protocolVersion: 3 }), /validation/u);
```

Run: `npm test -- --test-name-pattern="platform contracts"`

Expected: FAIL because the package does not exist.

- [ ] **Step 2: Configure npm workspaces without changing runtime behavior**

Set root workspaces to `client` and `packages/*`. Add explicit scripts `build:contracts`, `build:server`, `build:client` and `build:all`; `build` remains the server production build. Railway runs `npm ci && npm run build:server`; Cloudflare/GitHub runs `npm ci && npm run build:client`. Regenerate the root lockfile and remove the nested lockfile only after `npm ci` succeeds from a clean checkout.

- [ ] **Step 3: Implement exact common contracts**

```ts
export const GAME_IDS = ["alhabeed", "district-race", "chess", "shedding"] as const;
export type GameId = typeof GAME_IDS[number];
export const PROTOCOL_VERSION = 2 as const;
export interface RoomMember {
  playerId: string;
  userId?: string;
  displayName: string;
  connected: boolean;
  joinedAt: number;
  disconnectedAt?: number;
}
export interface RoomEnvelope<TGame> {
  code: string;
  gameId: GameId;
  protocolVersion: typeof PROTOCOL_VERSION;
  version: number;
  status: "lobby" | "active" | "finished";
  hostPlayerId: string;
  members: Record<string, RoomMember>;
  game: TGame;
  createdAt: number;
  deadlineAt?: number;
}
export interface RoomCommandEnvelope<TPayload> {
  protocolVersion: typeof PROTOCOL_VERSION;
  gameId: GameId;
  roomCode: string;
  commandId: string;
  expectedVersion: number;
  payload: TPayload;
}
```

Public types use `Omit<RoomMember, "userId">`; no public schema accepts `userId`.

- [ ] **Step 4: Consume the shared `GameId` in client and server registries**

Remove duplicate game-ID unions. Keep Hub behavior unchanged. Add a parity assertion that every `GAME_IDS` entry has exactly one client registry entry.

- [ ] **Step 5: Run clean-install verification**

Run from a clean disposable checkout or after preserving user changes:

```powershell
npm ci
npm run build:all
npm test
npm --workspace alhabeed-client test
```

Expected: all pass and no nested client lockfile is required.

- [ ] **Step 6: Commit the task**

```powershell
git add package.json package-lock.json client/package.json .github/workflows/pages.yml railway.json packages client/src/platform/gameRegistry.ts src/contracts/events.ts tests/platformContracts.test.ts
git add -u client/package-lock.json
git commit -m "refactor: share versioned platform contracts"
```

### Task 7: Introduce the shared room kernel and AlHabeed runtime adapter

**Owner:** Room kernel agent

**Files:**
- Create: `src/rooms/gameRuntime.ts`
- Create: `src/rooms/roomKernel.ts`
- Create: `src/rooms/types.ts`
- Create: `src/games/alhabeed/types.ts`
- Create: `src/games/alhabeed/runtime.ts`
- Create: `src/games/alhabeed/publicState.ts`
- Modify: `src/core/engine.ts`
- Modify: `src/core/types.ts`
- Modify: `src/server/service.ts`
- Test: `tests/roomKernel.test.ts`
- Modify: `tests/engine.test.ts`

**Dependencies:** Task 6.

**Interfaces:**
- Produces `GameRuntime<TState, TCommand, TPublic, TResult>` and `RoomKernel`.
- Keeps `GameEngine` as a compatibility facade so existing callers and tests retain their signatures during migration.

- [ ] **Step 1: Write failing kernel isolation tests**

Test membership authorization, host migration, protocol rejection and public redaction with a tiny fake runtime. Assert that serialized public state contains neither a known account UUID nor a hidden fake-game value.

Run: `npm test -- --test-name-pattern="room kernel"`

Expected: FAIL because the room kernel does not exist.

- [ ] **Step 2: Define the runtime interface**

```ts
export interface GameCommandContext {
  actorPlayerId: string;
  now: number;
}
export interface GameRuntime<TState, TCommand, TPublic, TResult> {
  readonly gameId: GameId;
  readonly rulesVersion: string;
  create(memberIds: string[], settings: unknown, now: number): TState;
  onMembershipChanged(state: TState, memberIds: string[], now: number): TState;
  apply(state: TState, command: TCommand, context: GameCommandContext): TState;
  advanceDeadline(state: TState, now: number): TState;
  deadlineAt(state: TState): number | undefined;
  status(state: TState): "lobby" | "active" | "finished";
  publicState(state: TState, viewerPlayerId: string): TPublic;
  result(state: TState): TResult | undefined;
}
```

`RoomKernel` alone checks room membership, host-only shared commands, connected state and protocol/game match before delegating game commands.

- [ ] **Step 3: Adapt AlHabeed without changing its rules**

Move game-only phase/settings/round/score data behind `AlHabeedRuntime`. Shared member display names and connection state remain in `RoomEnvelope.members`; `AlHabeedPublicState` combines public member data with game scores for the existing UI adapter. Preserve all current secrecy, scoring, timing, package balancing and self-vote behavior.

- [ ] **Step 4: Keep the compatibility facade**

The exported `GameEngine` methods retain `createRoom`, `joinRoom`, `reconnect`, `bindUser`, `updateSettings`, `start`, `submitAnswer`, `vote`, `advanceExpired`, `publicState`, `restore`, `getRoom` and `listRooms`. Internally they call `RoomKernel` plus `AlHabeedRuntime`; no server migration is required in this task.

- [ ] **Step 5: Run behavior and type verification**

Run:

```powershell
npm test -- --test-name-pattern="room kernel|nobody sees|public voting|public reveal|disconnect migrates|package"
npm run build:all
npm test
```

Expected: all pre-existing engine/security tests pass unchanged except import paths intentionally updated for shared contracts.

- [ ] **Step 6: Commit the task**

```powershell
git add src/rooms src/games/alhabeed src/core src/server/service.ts tests/roomKernel.test.ts tests/engine.test.ts
git commit -m "refactor: add shared room kernel"
```

### Task 8: Replace process-local command gating with atomic repository commits

**Owner:** Redis runtime agent

**Files:**
- Create: `src/rooms/atomicRoomRepository.ts`
- Create: `src/rooms/inMemoryAtomicRoomRepository.ts`
- Create: `src/rooms/roomCoordinator.ts`
- Modify: `src/persistence/redisRoomRepository.ts`
- Modify: `src/persistence/postgresRoomRepository.ts`
- Delete after cutover: `src/server/commandGate.ts`
- Modify: `tests/commandGate.test.ts` into `tests/roomCoordinator.test.ts`
- Create: `scripts/smokeRedisRuntime.ts`
- Modify: `package.json`

**Dependencies:** Task 7.

**Interfaces:**
- Produces `AtomicRoomRepository.load`, `create`, `commit` and `listDue`.
- `commit` returns `{ kind: "committed" | "duplicate" | "stale"; room: RoomEnvelope<unknown> }`.

- [ ] **Step 1: Write failing coordinator tests**

Cover these exact cases against `InMemoryAtomicRoomRepository`:

1. one expected-version command commits version `N + 1`;
2. the same command ID returns `duplicate` and does not reapply scoring;
3. a different command with old version returns `stale` and the latest public room;
4. two simultaneous commands at version `N` produce exactly one commit;
5. a failed game validation does not reserve the command ID.

Run: `npm test -- --test-name-pattern="room coordinator"`

Expected: FAIL because the coordinator does not exist.

- [ ] **Step 2: Implement the atomic contract**

```ts
export interface CommitRoomInput {
  code: string;
  expectedVersion: number;
  commandId: string;
  next: RoomEnvelope<unknown>;
  commandTtlSeconds: number;
}
export interface AtomicRoomRepository {
  load(code: string): Promise<RoomEnvelope<unknown> | undefined>;
  create(room: RoomEnvelope<unknown>): Promise<"created" | "exists">;
  commit(input: CommitRoomInput): Promise<CommitRoomResult>;
  listDue(now: number, limit: number): Promise<string[]>;
}
```

`RoomCoordinator.apply` loads current state, validates actor/protocol/game/version, computes a candidate through `RoomKernel`, then calls `commit`. It returns the repository’s latest state for duplicates and stale commands.

- [ ] **Step 3: Implement Redis CAS and deduplication in one Lua script**

The script checks the stored room version equals `expectedVersion`, checks the per-room command set, validates `next.version === expectedVersion + 1`, writes the snapshot, records and expires the command ID, refreshes the room TTL, and adds/removes the room in the deadline sorted set. Equal-version writes must never overwrite each other.

Use keys scoped to one hash slot for cluster safety, for example:

```text
alhabeed:v2:room:{A1B2C3}:snapshot
alhabeed:v2:room:{A1B2C3}:commands
alhabeed:v2:deadlines
```

If the selected managed Redis cluster cannot atomically combine the per-room keys with the global deadline set, commit the per-room state atomically and update the deadline index idempotently after commit; Task 9’s scheduler must also repair missing index entries from active-room scans.

- [ ] **Step 4: Implement PostgreSQL and in-memory parity**

PostgreSQL fallback commits use `UPDATE ... WHERE version = expectedVersion` inside a transaction plus a processed-command table introduced in Task 10’s migration. In-memory commits use a promise queue per code so concurrency tests are meaningful.

- [ ] **Step 5: Add the Redis smoke script**

`smokeRedisRuntime.ts` creates a random test code, races two commits, retries the winner’s command ID and verifies one `committed`, one `stale`, then one `duplicate`. It deletes only its exact random test keys in `finally`.

Run with provisioned Redis:

```powershell
$env:REDIS_URL='<staging Redis URL>'
npm run smoke:redis-runtime
```

Expected: `atomic room runtime smoke passed` and exit 0.

- [ ] **Step 6: Run focused and full tests**

Run:

```powershell
npm test -- --test-name-pattern="room coordinator"
npm run build:all
npm test
```

Expected: all pass; no production path imports `CommandGate`.

- [ ] **Step 7: Commit the task**

```powershell
git add src/rooms src/persistence src/server/commandGate.ts tests/commandGate.test.ts tests/roomCoordinator.test.ts scripts/smokeRedisRuntime.ts package.json package-lock.json
git commit -m "feat: make room commands atomic and idempotent"
```

### Task 9: Add owned, idempotent room deadlines

**Owner:** Redis runtime agent

**Files:**
- Create: `src/rooms/deadlineScheduler.ts`
- Modify: `src/rooms/roomCoordinator.ts`
- Modify: `src/persistence/redisRoomRepository.ts`
- Modify: `src/server/service.ts`
- Test: `tests/deadlineScheduler.test.ts`
- Modify: `docs/runbooks/redis-room-runtime.md`

**Dependencies:** Task 8.

**Interfaces:**
- Produces `DeadlineScheduler.poll(now)` and idempotent deadline command IDs `deadline:<room-version>:<deadline-at>`.
- Removes the global 500 ms in-process scan from the eventual server integration.

- [ ] **Step 1: Write failing deadline tests**

Use two scheduler instances over the same fake repository and assert:

```ts
await Promise.all([schedulerA.poll(deadline), schedulerB.poll(deadline)]);
assert.equal(runtime.advanceCount, 1);
assert.equal((await repository.load(code))?.version, initialVersion + 1);
```

Also test a worker crash before commit: the due room remains discoverable after claim expiry. Test a late scheduler advances all already-expired phases only through separate versioned commits, never by skipping result persistence.

Run: `npm test -- --test-name-pattern="deadline scheduler"`

Expected: FAIL because the scheduler does not exist.

- [ ] **Step 2: Implement claim leases without destructive dequeue**

`listDue` reads due codes without removing them. `DeadlineScheduler` acquires `alhabeed:v2:deadline-claim:{CODE}` with a 10-second TTL, reloads the room, checks the current `deadlineAt`, applies exactly one deterministic deadline command, commits by CAS, and releases the claim only if still owner. The successful commit updates/removes the sorted-set entry.

- [ ] **Step 3: Add repair behavior**

On initialization and every 60 seconds, scan the active room index in bounded pages and restore missing future deadline entries from snapshots. Do not load all rooms into a permanent process-local engine.

- [ ] **Step 4: Update the Redis loss/recovery runbook**

Document deadline index rebuilding, claim TTL behavior, duplicate deadline safety, alert thresholds and the rule that Redis flush/loss ends active rooms rather than reconstructing hidden live state from result records.

- [ ] **Step 5: Run tests and build**

Run:

```powershell
npm test -- --test-name-pattern="deadline scheduler|room coordinator"
npm run build:all
npm test
```

Expected: all pass; a two-scheduler test advances once.

- [ ] **Step 6: Commit the task**

```powershell
git add src/rooms src/persistence/redisRoomRepository.ts src/server/service.ts tests/deadlineScheduler.test.ts docs/runbooks/redis-room-runtime.md
git commit -m "feat: add owned room deadline processing"
```

### Task 10: Version results and persistence for multiple games

**Owner:** Server integration agent

**Files:**
- Create: `infra/migrations/0008_platform_room_runtime.sql`
- Modify: `src/results/types.ts`
- Modify: `src/results/gameResults.ts`
- Modify: `src/persistence/postgresGameResultRepository.ts`
- Modify: `src/results/inMemoryGameResultRepository.ts`
- Modify: `src/persistence/postgresRoomRepository.ts`
- Test: `tests/gameResults.test.ts`
- Test: `tests/migrations.test.ts`

**Dependencies:** Tasks 8–9.

**Interfaces:**
- Adds `gameId`, `rulesVersion` and `protocolVersion` to stored results and history.
- Adds durable processed-command support for the PostgreSQL fallback.

- [ ] **Step 1: Write failing result compatibility tests**

Assert that a legacy AlHabeed finished room maps to:

```ts
{
  gameId: "alhabeed",
  rulesVersion: "alhabeed-v1",
  protocolVersion: 2,
  roomCode: "A1B2C3",
  // existing contentVersion, settings, players and finishedAt remain
}
```

History filters remain account-owned and stats remain derived across AlHabeed results unless a caller supplies `gameId`.

- [ ] **Step 2: Create an additive migration**

The migration:

- adds `game_id text not null default 'alhabeed'`, `rules_version text not null default 'alhabeed-v1'` and `protocol_version smallint not null default 1` to `game_results`;
- backfills old rows and changes the protocol default to `2` for future inserts;
- adds `game_id` and `protocol_version` columns to `live_room_snapshots` for the PostgreSQL fallback;
- creates `processed_room_commands(room_code, command_id, processed_at, expires_at)` with primary key `(room_code, command_id)` and an expiry index;
- keeps existing result rows and player foreign keys intact.

- [ ] **Step 3: Update repositories and public history DTOs**

All inserts specify the new fields. Public history may expose `gameId` and `rulesVersion`; it never exposes the full game-state payload. Exactly-once uniqueness remains scoped to the globally unique room code.

- [ ] **Step 4: Verify migration and regression behavior**

Run:

```powershell
npm test -- --test-name-pattern="finished result|history|stats|migration"
npm run build:all
npm test
```

With a disposable database, run `npm run migrate` twice and verify the second run reports no changed digest and preserves row counts.

- [ ] **Step 5: Commit the task**

```powershell
git add infra/migrations/0008_platform_room_runtime.sql src/results src/persistence/postgresGameResultRepository.ts src/persistence/postgresRoomRepository.ts tests/gameResults.test.ts tests/migrations.test.ts
git commit -m "feat: version multi-game room results"
```

### Task 11: Expose protocol v2 events with a bounded v1 compatibility adapter

**Owner:** Server integration agent

**Files:**
- Modify: `src/contracts/events.ts`
- Create: `src/server/registerPlatformSockets.ts`
- Create: `src/server/registerLegacyAlHabeedSockets.ts`
- Modify: `src/server/index.ts`
- Modify: `src/server/service.ts`
- Modify: `client/src/games/alhabeed/socket.ts`
- Modify: `client/src/games/alhabeed/AlHabeedOnline.tsx`
- Test: `tests/platformSockets.test.ts`
- Modify: `scripts/smokeMultiplayer.ts`

**Dependencies:** Tasks 7–10.

**Interfaces:**
- Produces v2 events `platform:room:create`, `platform:room:join`, `platform:room:reconnect`, `platform:room:state`, `alhabeed:settings:update`, `alhabeed:game:start`, `alhabeed:round:answer`, and `alhabeed:round:vote`.
- Retains current v1 events as translations for one release window; v1 receives the existing public state shape.

- [ ] **Step 1: Write failing socket contract tests**

Test these cases through a real Fastify/Socket.IO test server:

1. protocol v2 create returns `gameId: "alhabeed"` and `protocolVersion: 2`;
2. a v2 AlHabeed command sent to a district-race room returns `GAME_MISMATCH`;
3. protocol 1 or 3 on a v2 event returns `UNSUPPORTED_PROTOCOL` with `minimum: 2` and `maximum: 2`;
4. a socket cannot act for a player or room other than its bound identity;
5. retrying one command ID does not double-score;
6. public socket state contains no account UUID or hidden answer before reveal;
7. current v1 events still complete one match.

- [ ] **Step 2: Extract server registration from the composition root**

`index.ts` creates dependencies and calls the two registration modules. Socket handlers contain no direct `GameEngine` mutation; every v2 mutation goes through `RoomCoordinator`. Legacy handlers translate payloads, invoke the same coordinator and translate public output back.

- [ ] **Step 3: Move the current client to v2 with clear upgrade handling**

The AlHabeed client emits v2 events and validates `protocolVersion`/`gameId` before storing state. `UNSUPPORTED_PROTOCOL` renders an Arabic refresh/update screen, clears no profile or reconnect token, and offers `location.reload()`.

- [ ] **Step 4: Remove global room scanning**

Replace `setInterval(...service.tickAll(), 500)` with `DeadlineScheduler`. Do not keep a second timer path. `service.initialize()` no longer loads every Redis room into a permanent in-memory map.

- [ ] **Step 5: Update the multiplayer smoke**

Run the three-player smoke once through v2 and once through the legacy adapter. Before reveal, recursively reject keys/values representing correct answer, authors, raw votes or user IDs. Race duplicate answer/vote commands and verify one accepted state transition.

- [ ] **Step 6: Run all checks**

Run:

```powershell
npm test -- --test-name-pattern="platform sockets"
npm run check
npm run smoke:multiplayer
```

Expected: all pass with one local API instance.

- [ ] **Step 7: Commit the task**

```powershell
git add src/contracts/events.ts src/server client/src/games/alhabeed scripts/smokeMultiplayer.ts tests/platformSockets.test.ts
git commit -m "feat: expose versioned multi-game room protocol"
```

### Task 12: Stage, load-check and release Room Runtime v2

**Owner:** Server integration agent for deployment; Sol reviewer for the gate

**Files:**
- Modify: `railway.json`
- Modify: `docs/runbooks/redis-room-runtime.md`
- Create: `docs/runbooks/protocol-v2-rollout.md`

**Dependencies:** Task 11.

**Interfaces:**
- Produces an explicit one-replica rollout, rollback criteria and a later scaling unlock.

- [ ] **Step 1: Define rollout and rollback conditions**

The rollout runbook specifies: migrate first, deploy one Railway replica, run v1/v2 smoke, monitor command outcomes/deadline lag, then soak. Roll back the application without rolling back additive migration `0008` if error rate exceeds 1%, any duplicate scoring occurs, any room misses a deadline by more than 3 seconds, or hidden state appears in a public projection.

- [ ] **Step 2: Add runtime metrics**

Ensure existing metrics expose stable counters/histograms for `committed`, `duplicate`, `stale`, deadline claims, deadline lag and protocol mismatch. Do not label metrics by room code, player ID or command ID.

- [ ] **Step 3: Run staging concurrency evidence**

With two staging API processes pointed at the same Redis/PostgreSQL services, create at least 100 rooms, submit concurrent same-version commands and process overlapping deadlines. Expected: one commit per version, no duplicate results, p95 accepted-command latency below 250 ms and p95 reconnect below 3 seconds.

- [ ] **Step 4: Sol Room Runtime Gate**

Sol inspects the Lua/CAS logic, scheduler crash behavior, protocol redaction, migration safety, v1 adapter and staging results. Reject if correctness depends on a process-local map/lock, equal-version writes can overwrite, deadlines are destructively dequeued before commit, or test evidence omits two-process concurrency.

- [ ] **Step 5: Commit and deploy one replica**

```powershell
git add railway.json docs/runbooks/redis-room-runtime.md docs/runbooks/protocol-v2-rollout.md
git commit -m "ops: define room protocol v2 rollout"
git push origin HEAD:main
```

After the production soak passes, update the runbook to state that multi-replica scaling is technically permitted but remains an explicit operator action. Do not change replica count as part of this task.

---

# Phase 3 — Original District Race Local Vertical Slice

The local slice is pass-and-play for 2–4 humans. Bots, ranked play, online rooms, purchases and voice are excluded. The domain package cannot import React, browser APIs, Node crypto, Socket.IO or persistence.

### Task 13: Freeze race rules v1 as executable fixtures

**Owner:** Race-domain agent; Sol reviews rule/IP boundaries before engine work

**Files:**
- Create: `docs/superpowers/specs/2026-09-13-district-race-rules-v1.md`
- Create: `packages/district-race-domain/package.json`
- Create: `packages/district-race-domain/tsconfig.json`
- Create: `packages/district-race-domain/src/types.ts`
- Create: `packages/district-race-domain/src/config.ts`
- Create: `packages/district-race-domain/src/fixtures.ts`
- Create: `packages/district-race-domain/src/index.ts`
- Test: `packages/district-race-domain/src/fixtures.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Dependencies:** Room Runtime v2 Gate.

**Interfaces:**
- Produces package `@alhabeed/district-race-domain` and `DISTRICT_RACE_RULES_VERSION = "district-race-v1"`.
- Produces `RaceConfig`, `RaceState`, `RaceCommand`, `RaceEvent`, `RandomSource` and fixed scenario fixtures.

- [ ] **Step 1: Record the exact v1 rules**

The rules document freezes this first-slice configuration:

- 2–4 players, two tokens per player, clockwise 24-space non-cross-shaped shared loop;
- each district gate is six loop spaces apart;
- each token completes 24 progress steps, then four private stage-lane steps; exact movement is required to reach stage position 28;
- movement draws come without replacement from `[1, 1, 2, 2, 3, 3, 4, 5]`, reshuffled with injected randomness when empty;
- on a turn the player draws once and moves exactly one legal token; if none is legal, the turn passes;
- an off-board token may enter its gate with any draw, consuming one movement point and using the remainder as progress;
- district gates and loop spaces 3, 9, 15 and 21 are safe gathering spaces and may hold multiple tokens;
- landing on an opponent on any other loop space creates a challenge that moves the opponent back three personal progress steps, never below zero;
- each player has one shortcut power adding two movement points before selecting a token, one shield power protecting the moved token until that player’s next turn, and one challenge power moving a challenged opponent back six rather than three;
- shortcut cannot create a move beyond stage position 28; challenge power is offered only when the chosen legal move lands on an opponent; shield and challenge cannot be spent on the same turn;
- landing exactly at personal progress 6 or 14 offers an optional original alley shortcut of two progress steps if the destination is legal;
- the first player to bring both tokens to stage position 28 wins immediately;
- local setup randomizes first player through the injected `RandomSource` and displays the result.

The document includes diagrams in coordinate-neutral text and explicitly forbids a cross board, colored home quadrants, copied token silhouettes and third-party sounds.

- [ ] **Step 2: Write failing fixture/type tests**

Fixtures cover entry with remainder, safe-space co-location, normal challenge, powered challenge, shield, optional alley, exact finish, no-legal-move pass and immediate victory. Tests assert every fixture’s command and expected events are serializable plain data.

- [ ] **Step 3: Define pure domain types**

```ts
export interface RandomSource { nextInt(maxExclusive: number): number }
export type RaceCommand =
  | { type: "DrawMove"; playerId: string }
  | { type: "ChooseMove"; playerId: string; tokenId: string; useShortcutPower: boolean }
  | { type: "ResolveLanding"; playerId: string; takeAlley: boolean; useShield: boolean; useChallenge: boolean }
  | { type: "PassTurn"; playerId: string };
```

State stores the shuffled bag, discard, turn number, active player, pending draw/landing decision, token progress, remaining powers, shield expiry turn, winner and append-only domain events. It stores no DOM element, animation state or display-only coordinate.

- [ ] **Step 4: Add package build/test scripts**

Add explicit root `build:race-domain` and package `build`/`test` scripts. Update `build:all` and both deployment builds so the package is compiled before a consumer.

- [ ] **Step 5: Run tests and the IP/rules Sol checkpoint**

Run:

```powershell
npm run build:race-domain
npm --workspace @alhabeed/district-race-domain test
npm run build:all
```

Expected: fixture serialization tests pass. Sol rejects the checkpoint if any rule is ambiguous, resembles protected visual expression, or requires UI code to determine legality.

- [ ] **Step 6: Commit the task**

```powershell
git add docs/superpowers/specs/2026-09-13-district-race-rules-v1.md packages/district-race-domain package.json package-lock.json
git commit -m "docs: freeze original district race rules"
```

### Task 14: Implement the deterministic race engine test-first

**Owner:** Race-domain agent

**Files:**
- Create: `packages/district-race-domain/src/engine.ts`
- Create: `packages/district-race-domain/src/legalMoves.ts`
- Create: `packages/district-race-domain/src/randomBag.ts`
- Create: `packages/district-race-domain/src/publicState.ts`
- Modify: `packages/district-race-domain/src/index.ts`
- Test: `packages/district-race-domain/src/engine.test.ts`
- Test: `packages/district-race-domain/src/legalMoves.test.ts`
- Test: `packages/district-race-domain/src/randomBag.test.ts`

**Dependencies:** Task 13 accepted.

**Interfaces:**
- Produces `createRace`, `applyRaceCommand`, `legalRaceMoves`, `publicRaceState` and `SequenceRandomSource` for tests.
- Every accepted command returns `{ state, events }`; rejected commands throw a stable `RaceRuleError` without mutating input.

- [ ] **Step 1: Write failing setup/random tests**

Test 2–4 player validation, unique player IDs, deterministic first player, Fisher–Yates draw-bag order with `SequenceRandomSource`, draw exhaustion/reshuffle and immutability of the input arrays.

- [ ] **Step 2: Implement setup and random bag minimally**

Reject fewer than two or more than four players. Reject duplicate/blank IDs. Use only `RandomSource.nextInt`; never call `Math.random`, `crypto` or time APIs inside the package.

- [ ] **Step 3: Write failing turn/legal-move tests**

Cover actor mismatch, choosing before drawing, drawing twice, invalid token, exact finish, overshoot rejection, automatic pass when no move exists and advancing to the next non-winning player.

- [ ] **Step 4: Implement command sequencing and legal moves**

All public functions return structured clones/new objects. `legalRaceMoves` is the sole legality source used by both command validation and future UI highlighting.

- [ ] **Step 5: Write failing landing/power/victory tests**

Execute every Task 13 fixture plus rejection of spent powers, illegal alley use, safe-space challenge, shield+challenge on one turn and commands after a winner exists.

- [ ] **Step 6: Implement landing, powers and victory**

Emit named domain events `MoveDrawn`, `TokenMoved`, `AlleyTaken`, `ShieldActivated`, `ChallengeResolved`, `TurnPassed` and `GameWon`. Event payloads contain IDs/progress values only, not localized copy.

- [ ] **Step 7: Implement public state**

The local public state may expose the current draw because all humans share a device. Keep bag order hidden so the same projection is safe for the later online plan. Expose legal token IDs/choices, never the remaining bag sequence.

- [ ] **Step 8: Run package and repository tests**

Run:

```powershell
npm --workspace @alhabeed/district-race-domain test
npm run build:all
npm test
```

Expected: all pass; searching the domain source for `Math.random`, `Date.now`, `window`, `document`, `socket` and `fetch` returns no matches.

- [ ] **Step 9: Commit the task**

```powershell
git add packages/district-race-domain
git commit -m "feat: add deterministic district race engine"
```

### Task 15: Balance the 10–15 minute slice with deterministic simulations

**Owner:** Race-domain agent

**Files:**
- Create: `packages/district-race-domain/src/simulation.ts`
- Test: `packages/district-race-domain/src/simulation.test.ts`
- Create: `scripts/simulateDistrictRace.ts`
- Modify: `package.json`
- Modify: `docs/superpowers/specs/2026-09-13-district-race-rules-v1.md`

**Dependencies:** Task 14.

**Interfaces:**
- Produces `simulateRace(input)` and aggregate metrics for turns, challenges, power use and winner position.
- Simulation agents choose only from `legalRaceMoves`; simulation does not add bot play to the product.

- [ ] **Step 1: Write failing reproducibility tests**

Two runs using the same seed and policy must return identical event logs and summary. A 1,000-game test must terminate every game within a conservative 500-turn safety bound.

- [ ] **Step 2: Implement seeded simulation**

Implement a small deterministic PRNG in the simulation module only. Policies are `firstLegal`, `furthestToken` and `preferChallenge`; production UI never imports them.

- [ ] **Step 3: Add the reporting script**

Run at least 10,000 games for 2, 3 and 4 players. Print median/p90 turns, challenge frequency, shortcut/shield/challenge usage and first-player win rate. Estimate duration using 6 seconds per uncomplicated turn and 10 seconds per decision/power turn.

- [ ] **Step 4: Apply only evidence-backed config changes**

If median estimated duration is outside 10–15 minutes, change values only in `config.ts`, update the frozen rules document and update fixtures in the same commit. Record before/after metrics in the rules document. Do not introduce bots, ranked systems or hidden rubber-banding.

- [ ] **Step 5: Run simulation and tests**

Run:

```powershell
npm run simulate:district-race -- --games 10000 --seed 20260913
npm --workspace @alhabeed/district-race-domain test
npm run check
```

Expected: deterministic report, no simulation exceeds 500 turns, and the documented median estimate is 10–15 minutes. First-player win rate for each player count stays within 8 percentage points of uniform; otherwise the first-player selection or rules return to Sol for review before UI work.

- [ ] **Step 6: Commit the task**

```powershell
git add packages/district-race-domain scripts/simulateDistrictRace.ts package.json package-lock.json docs/superpowers/specs/2026-09-13-district-race-rules-v1.md
git commit -m "test: validate district race balance"
```

### Task 16: Build the accessible pass-and-play race-board UI

**Owner:** Race-UI agent

**Files:**
- Create: `client/src/games/districtRace/DistrictRaceLocal.tsx`
- Create: `client/src/games/districtRace/RaceSetup.tsx`
- Create: `client/src/games/districtRace/RaceBoard.tsx`
- Create: `client/src/games/districtRace/TurnControls.tsx`
- Create: `client/src/games/districtRace/RaceResults.tsx`
- Create: `client/src/games/districtRace/useLocalRace.ts`
- Create: `client/src/games/districtRace/storage.ts`
- Create: `client/src/games/districtRace/index.ts`
- Create: `client/src/games/districtRace/districtRace.css`
- Create: `client/public/games/district-race-board.svg`
- Create: `client/public/games/district-race-token-sheet.svg`
- Modify: `content/assets.manifest.json`
- Test: `client/src/games/districtRace/DistrictRaceLocal.test.tsx`
- Test: `client/src/games/districtRace/storage.test.ts`

**Dependencies:** Task 15 and accepted asset provenance method.

**Interfaces:**
- Consumes only public exports of `@alhabeed/district-race-domain`.
- Produces `DistrictRaceLocal`; no backend call or Socket.IO event is introduced.
- Persists versioned local state under `alhabeed:district-race:local:v1`.

- [ ] **Step 1: Write failing setup and turn tests**

Use Testing Library to verify 2–4 unique nonblank names, start-player announcement, draw action, legal-token highlighting, disabled illegal tokens, choice dialogs for alley/powers, pass behavior, winner screen and new-game reset. Assert that UI actions construct domain commands and never directly modify token progress.

- [ ] **Step 2: Write failing storage tests**

The persisted envelope is `{ rulesVersion, savedAt, state }`. Reject unknown rules versions, malformed state and saves older than seven days. A rejected save is removed and setup opens with an Arabic recovery message.

- [ ] **Step 3: Implement setup and state hook**

`useLocalRace` owns one engine state and dispatches commands through `applyRaceCommand`. It saves after each accepted command and keeps rejected commands visible as localized errors without corrupting the previous state.

- [ ] **Step 4: Implement the original board presentation**

Use the curved 24-space loop and central gathering stage defined in the rules spec. Render tokens as buttons with text/shape indicators in addition to color. Provide an ordered textual move summary for screen readers. Keep DOM order aligned with the turn controls, not with absolute visual coordinates.

- [ ] **Step 5: Implement motion and device handoff**

Animate one token transition at a time in full-motion mode; reduced/low-power modes update immediately with a short highlight. Between turns, show a handoff curtain naming the next player so private power choices are not exposed accidentally.

- [ ] **Step 6: Create and register original assets**

Create original SVG board/token assets from the approved geometry. Calculate and record digests and truthful generation/creator information. The production manifest validator must pass; no asset may use `unverified` with `productionUse: true`.

- [ ] **Step 7: Run UI, asset and build checks**

Run:

```powershell
npm --workspace alhabeed-client test -- DistrictRaceLocal.test.tsx storage.test.ts
npm run assets:verify
npm run build:all
```

Expected: all pass; no race client file imports `serverUrl`, `socket.io-client` or identity tokens.

- [ ] **Step 8: Commit the task**

```powershell
git add client/src/games/districtRace client/public/games/district-race-board.svg client/public/games/district-race-token-sheet.svg content/assets.manifest.json
git commit -m "feat: add local district race vertical slice"
```

### Task 17: Enable the local race card and perform the Race Local Gate

**Owner:** Race-UI agent for integration; Sol reviewer for the gate

**Files:**
- Modify: `client/src/platform/gameRegistry.ts`
- Modify: `client/src/platform/routes.tsx`
- Modify: `client/src/platform/hub/HubPage.tsx`
- Modify: `client/src/platform/hub/HubPage.test.tsx`
- Modify: `client/src/App.tsx`
- Modify: `README.md`
- Create: `docs/runbooks/district-race-local-release.md`

**Dependencies:** Task 16.

**Interfaces:**
- Changes only `district-race.availability.local` from `coming-soon` to `playable`.
- Adds route `/games/district-race/local`; online remains `coming-soon` and has no online action.

- [ ] **Step 1: Update the failing registry/hub expectations**

Change tests to expect local playable games `['alhabeed', 'district-race']`, a “العب على نفس الجهاز” link on the district-race card and no online district-race link.

Run: `npm --workspace alhabeed-client test -- gameRegistry.test.ts HubPage.test.tsx`

Expected: FAIL until registry and routes are updated.

- [ ] **Step 2: Wire the local route**

Lazy-load `DistrictRaceLocal` so AlHabeed’s initial bundle does not include the race engine/UI. Add an error boundary with Arabic retry/back-to-hub actions. Do not add a room-creation path for the race game.

- [ ] **Step 3: Write the release runbook**

Document feature rollback as reverting the registry availability to `coming-soon`; saved local state remains on device and is not deleted. Document rules version, asset manifest IDs and simulation report command.

- [ ] **Step 4: Run final automated verification**

Run:

```powershell
npm ci
npm run check
npm --workspace @alhabeed/district-race-domain test
npm run simulate:district-race -- --games 10000 --seed 20260913
npm run assets:verify
git diff --check
```

Expected: all pass; the simulation meets Task 15 bounds.

- [ ] **Step 5: Perform one browser screenshot pass**

Create one screenshot sheet at 360, 768, 1024 and 1440 px covering hub, race setup, active turn and result. Verify no horizontal overflow, visible keyboard focus, shape/text distinction for tokens, reduced-motion behavior and that AlHabeed remains the dominant first card.

- [ ] **Step 6: Regression-smoke current production behaviors against staging**

Verify AlHabeed create/join/reconnect, local play, anonymous profile create/update, history and statistics. Confirm a cached protocol-v1 client either completes through the compatibility adapter or receives the documented explicit upgrade path; it must never mutate a v2 room with the wrong game/protocol.

- [ ] **Step 7: Sol Race Local Gate**

Sol reviews domain determinism, rules/spec parity, simulation evidence, UI command ownership, save-version recovery, asset provenance, responsive evidence and AlHabeed regressions. Reject if React determines legal moves, the random bag leaks through public state, online controls are exposed, or original-art evidence is incomplete.

- [ ] **Step 8: Commit and deploy**

```powershell
git add client/src/platform client/src/App.tsx README.md docs/runbooks/district-race-local-release.md
git commit -m "feat: launch local district race from the hub"
git push origin HEAD:main
```

Post-deploy acceptance: Cloudflare serves the playable local race route; Railway health is unchanged; no new backend race endpoint exists; asset verification matches the deployed files.

---

## Final acceptance matrix

| Requirement | Evidence |
|---|---|
| Existing AlHabeed behavior preserved | Full test suite plus create/join/reconnect/local/profile/history/stats smoke |
| Original responsive Hub v1 | Hub tests and one four-width screenshot sheet |
| Reduced-motion/low-power fallback | Hook tests and screenshot/browser inspection |
| Canonical Cloudflare frontend | Workflow/config/runbook plus live origin check |
| Versioned multi-game contracts | Contract tests and explicit unsupported-protocol response |
| Atomic/idempotent room mutation | In-memory race test, Redis Lua smoke and two-process staging evidence |
| Owned deadlines | Two-scheduler/crash tests and deadline-lag metrics |
| Hidden/private data excluded | Engine, socket and recursive redaction tests |
| Versioned multi-game results | Migration/repository/history tests |
| Deterministic race engine | Fixture, engine, random-bag and reproducibility tests |
| 2–4 player, 10–15 minute target | 10,000-game seeded simulation report |
| Original/provenance-documented assets | Production manifest validator and Sol asset review |
| Local-only race launch | Registry/routes test and absence of race network imports/endpoints |

## Plan self-review record

- Spec coverage: Hub v1, routing boundaries, dominant AlHabeed placement, motion fallbacks, canonical hosting, Room Runtime v2, single-writer constraint, shared membership, protocol versioning, atomic commands, owned deadlines, result versioning, deterministic 2–4 player race rules, power simulations, local pass-and-play, security redaction and asset provenance all map to explicit tasks and gates.
- Scope control: race online, LiveKit voice, chess and shedding-card implementations are not mixed into the first three shippable phases; exact prerequisite plan names and boundaries are recorded.
- Type consistency: `GameId`, protocol version, room envelope, command envelope, runtime interface, repository commit result and race package names are introduced once and consumed by later tasks under those names.
- Placeholder scan: the plan contains no unresolved implementation marker or unspecified error-handling/testing instruction.
- Contradiction scan: Hub v1 makes no backend protocol change; Room Runtime v2 precedes any new online game; race local uses the engine package but no network; Railway is not scaled during this plan; microphone remains disabled because voice is a later plan.

