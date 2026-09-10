# Production P0 Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the unauthenticated room-state leak and let online hosts select any published category safely before starting a match.

**Architecture:** Remove the unused raw room inspection endpoint so private submissions and votes are never serialized over HTTP. Fetch the published catalog into the React client, store selected package IDs in room settings, render the same grouped card selector used by local play, and validate the expanded 36-package selection at the socket contract and game-engine boundaries.

**Tech Stack:** TypeScript, Fastify, Socket.IO, React, Zod, Node test runner, Neon PostgreSQL, Redis.

## Global Constraints

- Preserve the existing three game modes and 3–10 player room behavior.
- Published question content continues to come from Neon in production.
- VIP-labelled categories remain free and selectable in this release.
- Never expose submissions, answer authors, correctness, or votes before reveal.

---

### Task 1: Remove the raw room-state endpoint

**Files:**
- Modify: `src/server/index.ts`
- Modify: `tests/engine.test.ts`

**Interfaces:**
- Consumes: `GameEngine.publicState(code, viewerId)` for player-specific socket payloads.
- Produces: no unauthenticated HTTP route capable of returning `RoomState`.

- [ ] **Step 1: Add a privacy regression assertion**

Extend the existing pre-reveal test to verify serialized public state contains neither `submissions` nor author/correctness fields:

```ts
const serialized=JSON.stringify(engine.publicState(code,"p1"));
assert.equal(serialized.includes("submissions"),false);
assert.equal(serialized.includes("correctAnswer"),false);
```

- [ ] **Step 2: Run the focused test**

Run: `npm run build && node --test dist/tests/engine.test.js`

Expected: PASS, proving the supported socket representation is safe.

- [ ] **Step 3: Delete the unsafe HTTP handler**

Remove this handler from `src/server/index.ts`:

```ts
app.get("/api/rooms/:code", async (request) => {
  const { code } = request.params as { code: string };
  return service.engine.getRoom(code);
});
```

- [ ] **Step 4: Verify HTTP and socket behavior**

Run the server, request `/api/rooms/ABC123`, and expect HTTP 404. Then run `SERVER_URL=<production-or-local-url> npx tsx scripts/smokeMultiplayer.ts` and expect `privateBeforeReveal:true`.

- [ ] **Step 5: Commit**

```bash
git add src/server/index.ts tests/engine.test.ts
git commit -m "fix: prevent raw room state disclosure"
```

### Task 2: Expand and validate online package settings

**Files:**
- Modify: `src/contracts/events.ts`
- Modify: `src/core/config.ts`
- Modify: `src/core/engine.ts`
- Modify: `tests/engine.test.ts`

**Interfaces:**
- Consumes: published package IDs sent by the host as `RoomSettings.packageIds`.
- Produces: `packageIds: string[]` accepting 1–36 unique IDs and rejecting duplicates or unavailable IDs before game start.

- [ ] **Step 1: Write failing package-selection tests**

Add tests proving a room accepts 36 unique known IDs, rejects duplicates, and fails cleanly when no selected package can supply a question.

```ts
assert.throws(
  ()=>engine.createRoom({id:"p1",name:"Ahmed"},{packageIds:["egypt","egypt"]}),
  (error:unknown)=>error instanceof GameError&&error.code==="INVALID_PACKAGES"
);
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npm run build && node --test dist/tests/engine.test.js`

Expected: FAIL because duplicate validation is not implemented yet.

- [ ] **Step 3: Expand the socket contract**

Change `roomSettingsPatchSchema.packageIds` to `.max(36)` and refine the array so `new Set(values).size===values.length`.

- [ ] **Step 4: Validate package IDs in the engine**

In `validateSettings`, trim IDs, reject duplicates with `INVALID_PACKAGES`, and preserve at least one package. Let `QuestionBank` remain the authority for whether the selected published content can supply the requested mode.

- [ ] **Step 5: Run all backend tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/contracts/events.ts src/core/config.ts src/core/engine.ts tests/engine.test.ts
git commit -m "feat: validate expanded online package selection"
```

### Task 3: Add grouped category selection to online room creation

**Files:**
- Create: `client/src/CategoryLibrary.tsx`
- Modify: `client/src/LocalGame.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/brand.css`
- Test: `scripts/smokeMultiplayer.ts`

**Interfaces:**
- Consumes: `CATEGORIES`, `/api/content/catalog`, `CategoryArtwork`, selected `CategoryId[]`.
- Produces: reusable `<CategoryLibrary selected onToggle />` and online `settings.packageIds` populated from published categories.

- [ ] **Step 1: Extract the existing grouped selector**

Create `CategoryLibrary.tsx` with props:

```ts
interface CategoryLibraryProps {
  selected: CategoryId[];
  onToggle:(category:CategoryId)=>void;
  compact?:boolean;
}
```

Move the three collapsible sections, counters, VIP badge, and card rendering out of `LocalGame.tsx` without changing local behavior.

- [ ] **Step 2: Load published categories in `App.tsx`**

Fetch `/api/content/catalog`, intersect returned IDs with `Object.keys(CATEGORIES)`, and initialize `settings.packageIds` with the available IDs. On failure, keep the current twelve defaults and show the existing Arabic error surface.

- [ ] **Step 3: Render the selector for room hosts**

In the create form and host lobby controls, render `CategoryLibrary` in compact mode. Toggling a card updates `settings.packageIds`; disable creation/start when the selection is empty.

- [ ] **Step 4: Update the multiplayer smoke test**

Use at least one newly added package such as `space`, verify the returned PostgreSQL question UUID, and assert the started round uses a selected package through its catalog fixture or prompt set.

- [ ] **Step 5: Verify client and multiplayer flows**

Run: `npm run check`

Expected: backend tests pass and Vite production build completes.

Run: `$env:SERVER_URL='https://alhabeed-production.up.railway.app'; npx tsx scripts/smokeMultiplayer.ts`

Expected: `{ "ok": true, "privateBeforeReveal": true, "revealedAfterVote": true }`.

- [ ] **Step 6: Visual verification**

At desktop and mobile widths, verify the create screen can open/close groups, select and deselect cards, display counts, and reach the lobby without horizontal overflow.

- [ ] **Step 7: Commit**

```bash
git add client/src/CategoryLibrary.tsx client/src/LocalGame.tsx client/src/App.tsx client/src/brand.css scripts/smokeMultiplayer.ts
git commit -m "feat: select grouped categories for online rooms"
```

### Task 4: Deploy and production-check the P0 slice

**Files:**
- Modify: `docs/superpowers/plans/2026-09-10-production-p0-hardening.md`

**Interfaces:**
- Consumes: commits from Tasks 1–3.
- Produces: deployed frontend/backend with 404 raw-room endpoint and selectable online categories.

- [ ] **Step 1: Push the completed commits**

Run: `git push origin HEAD:main`

Expected: GitHub accepts the push and Cloudflare/Railway deployments start.

- [ ] **Step 2: Verify production health and privacy**

Expect `/ready` to report `database:true` and `persistence:"redis"`; expect `/api/rooms/ABC123` to return 404; expect catalog counts of 36 categories and 862 questions.

- [ ] **Step 3: Run production multiplayer smoke**

Run the three-player smoke against Railway and confirm no private answer data is visible before reveal.

- [ ] **Step 4: Mark this plan complete**

Check completed boxes only after commands and production evidence pass.
