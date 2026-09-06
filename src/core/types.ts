export type PlayerId = string;
export type RoomCode = string;
export type ModeId = "habbedha" | "true_or_bluff" | "complete_bluff";
export type Phase = "lobby" | "answering" | "voting" | "reveal" | "finished";

export interface Player {
  id: PlayerId;
  name: string;
  connected: boolean;
  score: number;
  joinedAt: number;
  disconnectedAt?: number;
}

export interface RoomSummary {
  code: RoomCode;
  phase: Phase;
  playerCount: number;
  maxPlayers: number;
  createdAt: number;
}

export interface RoomSettings {
  modes: ModeId[];
  packageIds: string[];
  totalRounds: number;
  answerSeconds: number;
  voteSeconds: number;
  revealSeconds: number;
  allowHostTiming: boolean;
}

export interface Question {
  id: string;
  packageId: string;
  mode: ModeId;
  prompt: string;
  correctAnswer: string;
  explanation: string;
  sourceUrl?: string;
}

export interface AnswerOption {
  id: string;
  text: string;
  authorId: PlayerId | null;
  isCorrect: boolean;
  votes: PlayerId[];
}

export interface RoundState {
  number: number;
  mode: ModeId;
  questionId: string;
  prompt: string;
  phase: Exclude<Phase, "lobby" | "finished">;
  phaseEndsAt: number;
  submissions: Record<PlayerId, string>;
  options: AnswerOption[];
  votes: Record<PlayerId, string>;
  scoreDelta: Record<PlayerId, number>;
  explanation?: string;
  correctAnswer?: string;
}

export interface RoomState {
  code: RoomCode;
  hostId: PlayerId;
  phase: Phase;
  settings: RoomSettings;
  players: Record<PlayerId, Player>;
  round: RoundState | null;
  usedQuestionIds: string[];
  createdAt: number;
  version: number;
}

export interface PublicRoundState extends Omit<RoundState, "submissions" | "options"> {
  hasSubmitted: boolean;
  hasVoted: boolean;
  options: Array<Omit<AnswerOption, "authorId" | "isCorrect"> & {
    authorId?: PlayerId;
    isCorrect?: boolean;
  }>;
}

export interface PublicRoomState extends Omit<RoomState, "round"> {
  round: PublicRoundState | null;
}
