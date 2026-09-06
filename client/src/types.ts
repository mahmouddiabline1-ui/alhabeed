export type ModeId = "habbedha" | "true_or_bluff" | "complete_bluff";
export type Phase = "lobby" | "answering" | "voting" | "reveal" | "finished";

export interface Player { id: string; name: string; connected: boolean; score: number; joinedAt: number }
export interface Settings { modes: ModeId[]; packageIds: string[]; totalRounds: number; answerSeconds: number; voteSeconds: number; revealSeconds: number; allowHostTiming: boolean }
export interface Option { id: string; text: string; votes: string[]; authorId?: string; isCorrect?: boolean }
export interface Round { number: number; mode: ModeId; prompt: string; phase: "answering" | "voting" | "reveal"; phaseEndsAt: number; options: Option[]; votes: Record<string,string>; scoreDelta: Record<string,number>; explanation?: string; correctAnswer?: string; hasSubmitted: boolean; hasVoted: boolean }
export interface Room { code: string; hostId: string; phase: Phase; settings: Settings; players: Record<string,Player>; round: Round | null; version: number }
export interface Session { code: string; playerId: string; name: string }
