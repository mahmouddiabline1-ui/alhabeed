import type { FinishedGameResult, GameHistoryItem, GameResultRepository } from "./types.js";

export class InMemoryGameResultRepository implements GameResultRepository {
  readonly results=new Map<string,FinishedGameResult>();
  async saveOnce(result:FinishedGameResult):Promise<boolean>{
    if(this.results.has(result.roomCode))return false;
    this.results.set(result.roomCode,structuredClone(result)); return true;
  }
  async historyForUser(userId:string,limit:number):Promise<GameHistoryItem[]> {
    return [...this.results.values()].filter(result=>result.players.some(player=>player.userId===userId))
      .sort((a,b)=>b.finishedAt-a.finishedAt||b.roomCode.localeCompare(a.roomCode)).slice(0,limit)
      .map(result=>({roomCode:result.roomCode,contentVersion:result.contentVersion,finishedAt:result.finishedAt,settings:structuredClone(result.settings),player:structuredClone(result.players.find(player=>player.userId===userId)!),playerCount:result.players.length}));
  }
}
