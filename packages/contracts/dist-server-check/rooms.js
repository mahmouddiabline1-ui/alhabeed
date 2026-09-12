import { z } from "zod";
import { GAME_IDS, PROTOCOL_VERSION } from "./games.js";
const gameIdSchema = z.enum(GAME_IDS);
const roomCodeSchema = z.string().regex(/^[A-Z0-9]{6}$/u);
export const roomCommandEnvelopeSchema = z.object({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    gameId: gameIdSchema,
    roomCode: roomCodeSchema,
    commandId: z.string().uuid(),
    expectedVersion: z.number().int().nonnegative(),
    payload: z.unknown(),
}).strict();
export const roomMemberSchema = z.object({
    playerId: z.string().min(1),
    displayName: z.string().min(1),
    connected: z.boolean(),
    joinedAt: z.number(),
    disconnectedAt: z.number().optional(),
}).strict();
