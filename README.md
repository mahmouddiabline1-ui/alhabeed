# الهبيد — Game Logic Service

Backend-only prototype for the Egyptian social bluffing game. Branding and visual UI are intentionally outside this project phase.

## Included

- Three modes: `habbedha`, `true_or_bluff`, and `complete_bluff`.
- Nobody receives the correct answer during the answering phase.
- Players may vote for every displayed option, including their own; a self-vote never awards a deception point.
- Fixed defaults (45s answer, 25s vote, 10s reveal), customizable by the host while the room is in the lobby.
- Private rooms, 3–10 players, host-only settings/start, host migration, disconnect/reconnect identity, automatic phase timers and rematches through new rooms.
- Per-player public-state filtering prevents leaking answers, authors, correctness, or votes before reveal.
- Fastify health/room API and Socket.IO real-time protocol.
- Persistence interface plus in-memory implementation. Replace it with Redis/PostgreSQL without changing game rules.
- A tiny original Egyptian seed used only for development tests, not a production question bank.

## Run locally

Requires Node.js 20+.

```bash
npm install
npm test
npm run dev
```

Server: `http://127.0.0.1:3000`; health check: `GET /health`.

Create a room with REST:

```bash
curl -X POST http://127.0.0.1:3000/api/rooms -H "content-type: application/json" -d '{"name":"Ahmed"}'
```

## Socket.IO events

Client → server:

- `room:create` `{ name, settings? }`
- `room:join` `{ code, name }`
- `room:reconnect` `{ code, playerId }`
- `room:settings` `{ code, hostId, patch }`
- `game:start` `{ code, hostId }`
- `round:answer` `{ code, playerId, text }`
- `round:vote` `{ code, playerId, optionId }`

Server → client:

- `room:state`: viewer-filtered authoritative state.
- `game:error`: `{ code, message }`.

Create/join acknowledgements return the generated `player.id`. Store it locally and use it with `room:reconnect` after network interruption. Production authentication should replace this development identity mechanism.

## Architecture

`src/core` is deterministic domain logic with no network dependency. `src/server` adapts it to HTTP/WebSocket. `src/persistence` owns storage contracts. `src/content` supplies replaceable question data. The server is authoritative for time, votes, scoring, and phase transitions.

## Production next steps

- Redis room repository and distributed timer/lock ownership.
- PostgreSQL accounts, content moderation, packages, reports and analytics.
- Signed reconnect tokens/authentication and rate limiting.
- Admin CMS and a reviewed, sourced production question bank.
- Integration/load tests with multiple server instances.
