import { z } from "zod";
import { LIMITS } from "../core/config.js";
import { GameError } from "../core/errors.js";
export { GAME_IDS, PROTOCOL_VERSION } from "@alhabeed/contracts";
export type { GameId, RoomCommandEnvelope, RoomEnvelope, RoomMember } from "@alhabeed/contracts";

const forbiddenText = /[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u;
const safeText = (min:number,max:number,label:string) => z.string().trim().min(min).max(max)
  .refine(value => !forbiddenText.test(value), `${label} contains unsupported control characters`);
const roomCode = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/u, "Invalid room code");
const mode = z.enum(["habbedha", "true_or_bluff", "complete_bluff"]);
const commandEnvelope = {
  commandId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
};

export const roomSettingsPatchSchema = z.object({
  modes: z.array(mode).min(1).max(3).optional(),
  packageIds: z.array(z.string().trim().min(1).max(64))
    .min(1)
    .max(LIMITS.packages.max)
    .refine((values) => new Set(values).size === values.length, "Package IDs must be unique")
    .optional(),
  totalRounds: z.number().int().min(LIMITS.rounds.min).max(LIMITS.rounds.max).optional(),
  answerSeconds: z.number().int().min(LIMITS.answerSeconds.min).max(LIMITS.answerSeconds.max).optional(),
  voteSeconds: z.number().int().min(LIMITS.voteSeconds.min).max(LIMITS.voteSeconds.max).optional(),
  revealSeconds: z.number().int().min(LIMITS.revealSeconds.min).max(LIMITS.revealSeconds.max).optional(),
  allowHostTiming: z.boolean().optional(),
}).strict();

export const clientEventSchemas = {
  roomCreate: z.object({ name: safeText(2,24,"Name"), settings: roomSettingsPatchSchema.optional() }).strict(),
  roomJoin: z.object({ code: roomCode, name: safeText(2,24,"Name") }).strict(),
  roomReconnect: z.object({ code: roomCode, token: z.string().min(40).max(1024) }).strict(),
  roomSettings: z.object({ code: roomCode, patch: roomSettingsPatchSchema, ...commandEnvelope }).strict(),
  gameStart: z.object({ code: roomCode, ...commandEnvelope }).strict(),
  roundAnswer: z.object({ code: roomCode, text: safeText(LIMITS.answerLength.min,LIMITS.answerLength.max,"Answer"), ...commandEnvelope }).strict(),
  roundVote: z.object({ code: roomCode, optionId: z.string().uuid(), ...commandEnvelope }).strict(),
} as const;

export function parsePayload<T>(schema:z.ZodType<T>, payload:unknown):T {
  const result = schema.safeParse(payload);
  if (!result.success) throw new GameError("INVALID_PAYLOAD", result.error.issues[0]?.message ?? "Invalid payload");
  return result.data;
}

export type SocketIdentity = { code:string; playerId:string };
