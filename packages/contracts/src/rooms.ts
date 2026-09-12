import { z } from "zod";
import { GAME_IDS, PROTOCOL_VERSION, type GameId } from "./games.js";

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

export type PublicRoomMember = Omit<RoomMember, "userId">;
