export const GAME_IDS = ["alhabeed", "district-race", "chess", "shedding"] as const;
export type GameId = typeof GAME_IDS[number];
export const PROTOCOL_VERSION = 2 as const;
