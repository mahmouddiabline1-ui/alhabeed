export interface FinishedPlayerResult {
  playerId:string;
  userId?:string;
  displayName:string;
  score:number;
  rank:number;
}

export interface FinishedGameResult {
  roomCode:string;
  contentVersion:string;
  finishedAt:number;
  settings:{modes:string[];packageIds:string[];totalRounds:number};
  players:FinishedPlayerResult[];
}

export interface GameHistoryItem extends Omit<FinishedGameResult,"players"> {
  player:FinishedPlayerResult;
  playerCount:number;
}

export interface GameResultRepository {
  saveOnce(result:FinishedGameResult):Promise<boolean>;
  historyForUser(userId:string,limit:number):Promise<GameHistoryItem[]>;
}
