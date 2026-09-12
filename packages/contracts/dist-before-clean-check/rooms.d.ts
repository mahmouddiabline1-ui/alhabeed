import { z } from "zod";
import { PROTOCOL_VERSION, type GameId } from "./games.js";
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
export declare const roomCommandEnvelopeSchema: z.ZodObject<{
    protocolVersion: z.ZodLiteral<2>;
    gameId: z.ZodEnum<{
        alhabeed: "alhabeed";
        "district-race": "district-race";
        chess: "chess";
        shedding: "shedding";
    }>;
    roomCode: z.ZodString;
    commandId: z.ZodString;
    expectedVersion: z.ZodNumber;
    payload: z.ZodUnknown;
}, z.core.$strict>;
export declare const roomMemberSchema: z.ZodObject<{
    playerId: z.ZodString;
    displayName: z.ZodString;
    connected: z.ZodBoolean;
    joinedAt: z.ZodNumber;
    disconnectedAt: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
export type PublicRoomMember = Omit<RoomMember, "userId">;
