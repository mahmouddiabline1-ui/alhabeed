import Fastify from "fastify";
import cors from "@fastify/cors";
import staticFiles from "@fastify/static";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Server as SocketServer } from "socket.io";
import { GameEngine } from "../core/engine.js";
import { GameError } from "../core/errors.js";
import { QuestionBank } from "../core/questions.js";
import type { RoomSettings } from "../core/types.js";
import { seedQuestions } from "../content/seed.js";
import { InMemoryRoomRepository } from "../persistence/repository.js";
import { GameService } from "./service.js";

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
const clientDist = resolve(process.cwd(), "client", "dist");
if (existsSync(clientDist)) {
  await app.register(staticFiles, { root: clientDist, wildcard: false });
  app.get("/", async (_request, reply) => reply.sendFile("index.html"));
}
const io = new SocketServer(app.server, { cors: { origin: true } });
const service = new GameService(new GameEngine(new QuestionBank(seedQuestions)), new InMemoryRoomRepository());
await service.initialize();

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof GameError) return reply.status(400).send({ error: error.code, message: error.message });
  app.log.error(error); return reply.status(500).send({ error: "INTERNAL_ERROR" });
});
app.get("/health", async () => ({ ok: true }));
app.get("/api/rooms/:code", async (request) => {
  const { code } = request.params as { code: string };
  return service.engine.getRoom(code);
});
app.post("/api/rooms", async (request) => {
  const body = request.body as { name: string; settings?: Partial<RoomSettings> };
  return service.create(body.name, body.settings);
});

const emitRoom = (code: string) => {
  const state = service.engine.getRoom(code);
  for (const player of Object.values(state.players)) io.to(`${code}:${player.id}`).emit("room:state", service.engine.publicState(code, player.id));
};
const guard = (socket: typeof io.sockets.sockets extends Map<any, infer S> ? S : never, action: () => Promise<unknown> | unknown) => Promise.resolve().then(action).catch((error) => socket.emit("game:error", { code: error instanceof GameError ? error.code : "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown error" }));

io.on("connection", (socket) => {
  socket.on("room:create", (payload: { name: string; settings?: Partial<RoomSettings> }, ack) => guard(socket, async () => { const result = await service.create(payload.name, payload.settings); socket.data.identity = { code: result.room.code, playerId: result.player.id }; socket.join(`${result.room.code}:${result.player.id}`); ack?.({ player: result.player, room: service.engine.publicState(result.room.code, result.player.id) }); emitRoom(result.room.code); }));
  socket.on("room:join", (payload: { code: string; name: string }, ack) => guard(socket, async () => { const player = service.newPlayer(payload.name); const room = await service.persist(service.engine.joinRoom(payload.code, player)); socket.data.identity = { code: room.code, playerId: player.id }; socket.join(`${room.code}:${player.id}`); ack?.({ player, room: service.engine.publicState(room.code, player.id) }); emitRoom(room.code); }));
  socket.on("room:reconnect", (payload: { code: string; playerId: string }, ack) => guard(socket, async () => { const room = await service.persist(service.engine.reconnect(payload.code, payload.playerId)); socket.data.identity = payload; socket.join(`${room.code}:${payload.playerId}`); ack?.(service.engine.publicState(room.code, payload.playerId)); emitRoom(room.code); }));
  const mutation = (event: string, fn: (p: any) => any) => socket.on(event, (payload: any, ack?: Function) => guard(socket, async () => { const room = await service.persist(fn(payload)); ack?.(service.engine.publicState(room.code, payload.playerId ?? payload.hostId)); emitRoom(room.code); }));
  mutation("room:settings", p => service.engine.updateSettings(p.code, p.hostId, p.patch));
  mutation("game:start", p => service.engine.start(p.code, p.hostId));
  mutation("round:answer", p => service.engine.submitAnswer(p.code, p.playerId, p.text));
  mutation("round:vote", p => service.engine.vote(p.code, p.playerId, p.optionId));
  socket.on("disconnect", () => guard(socket, async () => { const identity = socket.data.identity as { code: string; playerId: string } | undefined; if (!identity) return; await service.persist(service.engine.setConnected(identity.code, identity.playerId, false)); emitRoom(identity.code); }));
});

setInterval(async () => { for (const room of await service.tickAll()) emitRoom(room.code); }, 500).unref();
const port = Number(process.env.PORT ?? 3000);
await app.listen({ port, host: process.env.HOST ?? "0.0.0.0" });
