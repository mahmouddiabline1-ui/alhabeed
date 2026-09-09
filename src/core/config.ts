import type { RoomSettings } from "./types.js";

export const DEFAULT_SETTINGS: RoomSettings = {
  modes: ["habbedha", "true_or_bluff", "complete_bluff"],
  packageIds: ["egypt", "history", "football", "screen", "food", "science", "music", "technology", "nature", "world", "egypt_landmarks", "world_landmarks"],
  totalRounds: 9,
  answerSeconds: 45,
  voteSeconds: 25,
  revealSeconds: 10,
  allowHostTiming: true
};

export const LIMITS = {
  players: { min: 3, max: 10 },
  rounds: { min: 3, max: 30 },
  answerSeconds: { min: 15, max: 180 },
  voteSeconds: { min: 10, max: 90 },
  revealSeconds: { min: 5, max: 30 },
  answerLength: { min: 1, max: 160 }
} as const;
