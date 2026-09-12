# AlHabeed Social Game Platform Design

## Product direction

AlHabeed remains the primary brand and flagship bluff game. The product expands through an “AlHabeed World” game hub inside the same Web/PWA, where additional original social games are secondary experiences rather than a replacement for AlHabeed.

The first release targets modern mobile and desktop browsers as a PWA. Native iOS/Android background voice is out of scope. Cloudflare Pages remains the canonical frontend and Railway remains the API/realtime host.

## Experience and visual language

The landing screen becomes a game hub. The AlHabeed card is the dominant playable feature, followed by a smaller “Games of the Gathering” collection. Every game has an original cover, icon, motion motif, player-count label, local/online availability and release status.

Motion uses an original layered background, subtle character reactions, game-card depth and route transitions. It must preserve readability, support `prefers-reduced-motion`, avoid heavy continuous GPU work and degrade cleanly on low-power devices.

The existing orange, navy, cream and yellow identity is retained. New games receive distinct accent colors without copying another game’s trade dress.

## Architecture

Use an incremental modular monolith: React/Vite PWA, Fastify, Socket.IO, Redis and Neon/PostgreSQL remain. Add a typed game registry and an isolated deterministic engine per game. Shared rooms own membership, presence, host controls, reconnect, protocol versions and voice authorization. Each game owns rules, commands, public-state projection and result mapping.

The current bluff game is adapted behind the registry without breaking its existing local and online flows. Live room writes must remain single-instance until the Redis runtime has atomic ownership, command deduplication and deadline processing. Railway must not scale beyond one API replica before that work ships.

## Delivery sequence

1. Platform Hub v1: original animated hub, typed game registry, clean shell/routing boundaries, AlHabeed playable and upcoming games clearly labelled.
2. Room Runtime v2: `gameId`, protocol version, game-specific command namespaces, atomic/idempotent mutation and owned deadlines.
3. Original race-board local vertical slice: deterministic rules engine, 2–4 players, 10–15 minute target, original board geometry, pieces, powers and terminology.
4. Original race-board online: server-authoritative randomness and moves, timers, reconnect and result history.
5. Room voice pilot: hosted LiveKit SFU, TURN, short-lived room-scoped tokens, authenticated speakers, mute, push-to-talk, host moderation and device recovery. No recording or transcription.
6. Chess: established rules with original board, pieces, animation and sound; any rules library must pass license review.
7. Original shedding-card game: original deck taxonomy, action semantics, terminology, iconography and presentation; no UNO name, deck, copy or trade dress.

## Original race-board concept

The working concept is a four-district gathering race. Players move original character tokens through a non-cross-shaped loop toward a shared central stage. Movement comes from a server/local engine-owned random draw, while limited character powers create choices around shortcuts, shields and challenges. Exact power balance is validated through engine simulations before online release.

The first slice is pass-and-play with 2–4 human players. Bots and ranked matchmaking are later work. The client never declares a roll, legal move or winner in online play.

## Voice and safety

Audio never travels through Socket.IO. Socket.IO only coordinates membership and signaling metadata. LiveKit provides SFU/TURN infrastructure suitable for mobile carrier networks. The API issues short-lived tokens only after verifying authenticated room membership.

Guests may play but cannot speak in the first voice release. Required controls are mic permission state, mute, push-to-talk, host mute/kick, block/report, reconnect, device switching, echo cancellation and low-bandwidth feedback. Recording and transcription are explicitly disabled.

## Data and security

All durable profile, content, result and progression data comes from Neon. Redis stores live room state. Public room projections never expose account IDs, hidden answers, raw votes, voice credentials or provider secrets.

Protocols are versioned so cached PWAs fail clearly instead of corrupting rooms. Cross-site refresh endpoints require explicit Origin/CSRF checks. Purchases, ranked play and durable voice sanctions require a recoverable identity flow before launch.

## Copyright and asset provenance

Mechanics may inspire high-level genres, but names, board/card layouts, token silhouettes, icons, characters, sounds, copy and animations must be original. Every new asset receives a manifest entry containing creator or generation method, prompt/source, license, creation date and digest. Existing unverified art is audited before becoming platform-wide identity.

## Acceptance gates

- Existing AlHabeed create, join, reconnect, local play, profiles, history and stats continue to pass.
- The hub is responsive at 360, 768, 1024 and 1440 pixels with no horizontal overflow.
- Motion has reduced-motion and low-power fallbacks.
- Each engine has deterministic unit tests and rejects illegal client commands.
- Online games persist safe results exactly once and never store hidden answer/vote payloads.
- Voice tokens cannot be minted by non-members and contain no provider secret.
- Production uses only original or provenance-documented assets.
