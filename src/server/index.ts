import Fastify from "fastify";
import cors from "@fastify/cors";
import staticFiles from "@fastify/static";
import rateLimit from "@fastify/rate-limit";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Server as SocketServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import type { ZodType } from "zod";
import { GameEngine } from "../core/engine.js";
import { GameError } from "../core/errors.js";
import { QuestionBank } from "../core/questions.js";
import { seedQuestions } from "../content/seed.js";
import { loadPublishedQuestions } from "../content/postgresQuestions.js";
import { InMemoryRoomRepository } from "../persistence/repository.js";
import { openPostgres, PostgresRoomRepository } from "../persistence/postgresRoomRepository.js";
import { RedisRoomRepository } from "../persistence/redisRoomRepository.js";
import { GameService } from "./service.js";
import { clientEventSchemas, parsePayload, type SocketIdentity } from "../contracts/events.js";
import { GuestTokenService } from "../security/guestTokens.js";
import { CommandGate } from "./commandGate.js";
import { allowedOrigins, originAllowed, SocketRateLimiter } from "./security.js";
import { loadConfig } from "./config.js";
import { MetricsRegistry } from "../observability/metrics.js";
import { z } from "zod";

const config=loadConfig();
const metrics=new MetricsRegistry();
const origins=allowedOrigins(process.env);
const corsOrigin=(origin:string|undefined,callback:(error:Error|null,allow:boolean)=>void) => callback(null,originAllowed(origin,origins));
const app = Fastify({ logger: {redact:{paths:["req.headers.authorization","req.headers.cookie","request.body.token","request.body.receipt","request.body.answer"],censor:"[REDACTED]"}}, bodyLimit: 16 * 1024, trustProxy: true });
await app.register(cors, { origin: corsOrigin, credentials: true });
await app.register(rateLimit,{max:100,timeWindow:"1 minute"});
app.addHook("onSend",async (_request,reply,payload) => {
  reply.header("X-Content-Type-Options","nosniff");
  reply.header("Referrer-Policy","no-referrer");
  reply.header("Permissions-Policy","camera=(), microphone=(), geolocation=()");
  reply.header("Content-Security-Policy","default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  return payload;
});
const clientDist = resolve(process.cwd(), "client", "dist");
if (existsSync(clientDist)) {
  await app.register(staticFiles, { root: clientDist, wildcard: false });
}
const io = new SocketServer(app.server, { cors: { origin: corsOrigin, credentials: true }, maxHttpBufferSize: 16 * 1024 });
const sql=config.databaseUrl ? openPostgres(config.databaseUrl) : null;
const redis=config.redisUrl ? createClient({url:config.redisUrl}) : null;
const redisSub=redis?.duplicate() ?? null;
if(redis&&redisSub){await Promise.all([redis.connect(),redisSub.connect()]);io.adapter(createAdapter(redis,redisSub));}
const roomRepository=redis ? new RedisRoomRepository(redis) : sql ? new PostgresRoomRepository(sql) : new InMemoryRoomRepository();
const databaseQuestions=sql ? await loadPublishedQuestions(sql) : [];
if(config.environment==="production"&&!databaseQuestions.length)throw new Error("Production requires published questions in PostgreSQL");
const service = new GameService(new GameEngine(new QuestionBank(databaseQuestions.length?databaseQuestions:seedQuestions)), roomRepository);
const guestTokens = new GuestTokenService(config.sessionSecret);
const commandGate = new CommandGate();
const socketRateLimiter = new SocketRateLimiter();
await service.initialize();
if (sql) app.addHook("onClose",async()=>{ await sql.end({timeout:5}); });
if (redis&&redisSub) app.addHook("onClose",async()=>{ await Promise.all([redis.quit(),redisSub.quit()]); });

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof GameError) return reply.status(400).send({ error: error.code, message: error.message });
  app.log.error(error); return reply.status(500).send({ error: "INTERNAL_ERROR" });
});
app.get("/health", async () => ({ ok: true }));
app.get("/ready", async (_request,reply) => {
  if(sql)await sql`select 1`;
  if(redis&&!redis.isReady)throw new Error("Redis is not ready");
  return reply.send({ok:true,persistence:redis?"redis":sql?"postgres":"memory",database:Boolean(sql)});
});
app.get("/metrics",async(request,reply)=>{
  if(config.metricsToken&&request.headers.authorization!==`Bearer ${config.metricsToken}`)return reply.status(401).send({error:"UNAUTHORIZED"});
  return reply.type("text/plain; version=0.0.4").send(metrics.render());
});
app.get("/api/rooms/:code", async (request) => {
  const { code } = request.params as { code: string };
  return service.engine.getRoom(code);
});
const localQuestionRequest=z.object({
  modes:z.array(z.enum(["habbedha","true_or_bluff","complete_bluff"])).min(1).max(3),
  categoryIds:z.array(z.string().min(1).max(64)).min(1).max(12),
  count:z.number().int().min(3).max(30),
}).strict();
app.get("/api/content/catalog",async()=>({
  categories:[...new Set(databaseQuestions.map(question=>question.packageId))].map(id=>({id,count:databaseQuestions.filter(question=>question.packageId===id).length})),
  totalQuestions:databaseQuestions.length,
}));
app.post("/api/local/questions",{config:{rateLimit:{max:20,timeWindow:"1 minute"}}},async(request,reply)=>{
  const parsed=localQuestionRequest.safeParse(request.body);
  if(!parsed.success)return reply.status(400).send({error:"INVALID_REQUEST"});
  const selected=new QuestionBank(databaseQuestions.length?databaseQuestions:seedQuestions).sample(parsed.data.modes,parsed.data.categoryIds,parsed.data.count);
  if(selected.length<parsed.data.count)return reply.status(409).send({error:"NOT_ENOUGH_QUESTIONS",available:selected.length});
  return {questions:selected.map(question=>({id:question.id,mode:question.mode,category:question.packageId,prompt:question.prompt,correct:question.correctAnswer,decoys:question.decoys??[],explanation:question.explanation}))};
});
app.post("/api/rooms", {config:{rateLimit:{max:5,timeWindow:"10 minutes"}}}, async (request) => {
  const body = parsePayload(clientEventSchemas.roomCreate, request.body);
  const result=await service.create(body.name, body.settings);
  return {...result,reconnectToken:guestTokens.issue(result.room.code,result.player.id)};
});

const emitRoom = (code: string) => {
  const state = service.engine.getRoom(code);
  for (const player of Object.values(state.players)) io.to(`${code}:${player.id}`).emit("room:state", service.engine.publicState(code, player.id));
};
const guard = (socket: typeof io.sockets.sockets extends Map<any, infer S> ? S : never, action: () => Promise<unknown> | unknown) => Promise.resolve().then(action).catch((error) => socket.emit("game:error", { code: error instanceof GameError ? error.code : "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Unknown error" }));

io.on("connection", (socket) => {
  metrics.add("alhabeed_socket_connections_total");
  metrics.add("alhabeed_active_sockets",1);
  socket.use((_packet,next) => {
    try { socketRateLimiter.consume(socket.handshake.address); next(); }
    catch (error) { next(error instanceof Error ? error : new Error("Rate limited")); }
  });
  const identity = ():SocketIdentity => {
    const value = socket.data.identity as SocketIdentity|undefined;
    if (!value) throw new GameError("UNAUTHENTICATED", "Join or reconnect before sending game commands");
    return value;
  };
  socket.on("room:create", (raw:unknown, ack) => guard(socket, async () => { const payload=parsePayload(clientEventSchemas.roomCreate,raw); const result = await service.create(payload.name, payload.settings); socket.data.identity = { code: result.room.code, playerId: result.player.id }; socket.join(`${result.room.code}:${result.player.id}`); ack?.({ player: result.player, room: service.engine.publicState(result.room.code, result.player.id), reconnectToken:guestTokens.issue(result.room.code,result.player.id) }); emitRoom(result.room.code); }));
  socket.on("room:join", (raw:unknown, ack) => guard(socket, async () => { const payload=parsePayload(clientEventSchemas.roomJoin,raw); const player = service.newPlayer(payload.name); const room = await service.persist(service.engine.joinRoom(payload.code, player)); socket.data.identity = { code: room.code, playerId: player.id }; socket.join(`${room.code}:${player.id}`); ack?.({ player, room: service.engine.publicState(room.code, player.id), reconnectToken:guestTokens.issue(room.code,player.id) }); emitRoom(room.code); }));
  socket.on("room:reconnect", (raw:unknown, ack) => guard(socket, async () => { const payload=parsePayload(clientEventSchemas.roomReconnect,raw); const claims=guestTokens.verify(payload.token,payload.code); const room = await service.persist(service.engine.reconnect(payload.code, claims.playerId)); socket.data.identity = {code:room.code,playerId:claims.playerId}; socket.join(`${room.code}:${claims.playerId}`); ack?.(service.engine.publicState(room.code, claims.playerId)); emitRoom(room.code); }));
  const mutation = <T extends {code:string;commandId:string;expectedVersion:number}>(event:string, schema:ZodType<T>, fn:(p:T,viewer:SocketIdentity)=>any) => socket.on(event, (raw:unknown, ack?:Function) => guard(socket, async () => {
    const viewer=identity();
    const payload=parsePayload(schema,raw);
    if (payload.code !== viewer.code) throw new GameError("ROOM_MISMATCH","Command room does not match session");
    const key=`${viewer.code}:${viewer.playerId}:${payload.commandId}`;
    const startedAt=Date.now();
    if (commandGate.claim(key,payload.expectedVersion,service.engine.getRoom(viewer.code).version)==="duplicate") {
      metrics.add("alhabeed_room_commands_total",1,{event,result:"duplicate"});
      ack?.(service.engine.publicState(viewer.code,viewer.playerId));
      return;
    }
    try {
      const room=await service.persist(fn(payload,viewer));
      const state=service.engine.publicState(room.code,viewer.playerId);
      ack?.(state);
      emitRoom(room.code);
      metrics.add("alhabeed_room_commands_total",1,{event,result:"accepted"});
      metrics.add("alhabeed_room_command_duration_ms_total",Date.now()-startedAt,{event});
    } catch (error) {
      commandGate.release(key);
      throw error;
    }
  }));
  mutation("room:settings", clientEventSchemas.roomSettings, (p,viewer) => service.engine.updateSettings(p.code, viewer.playerId, p.patch));
  mutation("game:start", clientEventSchemas.gameStart, (p,viewer) => service.engine.start(p.code, viewer.playerId));
  mutation("round:answer", clientEventSchemas.roundAnswer, (p,viewer) => service.engine.submitAnswer(p.code, viewer.playerId, p.text));
  mutation("round:vote", clientEventSchemas.roundVote, (p,viewer) => service.engine.vote(p.code, viewer.playerId, p.optionId));
  socket.on("disconnect", () => { metrics.add("alhabeed_active_sockets",-1);guard(socket, async () => { const identity = socket.data.identity as { code: string; playerId: string } | undefined; if (!identity) return; await service.persist(service.engine.setConnected(identity.code, identity.playerId, false)); emitRoom(identity.code); }); });
});

setInterval(async () => { for (const room of await service.tickAll()) emitRoom(room.code); }, 500).unref();
await app.listen({ port:config.port, host:config.host });
