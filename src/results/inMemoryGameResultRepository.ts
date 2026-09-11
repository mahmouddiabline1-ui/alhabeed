import type { FinishedGameResult, GameHistoryItem, GameResultRepository, PlayerGameStats } from "./types.js";

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
  async statsForUser(userId:string):Promise<PlayerGameStats> {
    const players=[...this.results.values()].flatMap(result=>result.players.filter(player=>player.userId===userId));
    if(!players.length)return {gamesPlayed:0,wins:0,totalScore:0,bestScore:0,averageRank:null};
    const totalScore=players.reduce((sum,player)=>sum+player.score,0);
    const rankTotal=players.reduce((sum,player)=>sum+player.rank,0);
    return {
      gamesPlayed:players.length,
      wins:players.filter(player=>player.rank===1).length,
      totalScore,
      bestScore:Math.max(...players.map(player=>player.score)),
      averageRank:rankTotal/players.length,
    };
  }
}
