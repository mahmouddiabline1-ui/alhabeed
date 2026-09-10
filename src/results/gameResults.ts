import type { RoomState } from "../core/types.js";
import type { FinishedGameResult } from "./types.js";

export function resultFromFinishedRoom(room:RoomState,contentVersion:string,finishedAt=Date.now()):FinishedGameResult {
  if(room.phase!=="finished")throw new Error("Only finished rooms can produce results");
  const ordered=Object.values(room.players).sort((a,b)=>b.score-a.score||a.joinedAt-b.joinedAt||a.id.localeCompare(b.id));
  let previousScore:number|undefined; let previousRank=0;
  const players=ordered.map((player,index)=>{
    const rank=player.score===previousScore?previousRank:index+1;
    previousScore=player.score; previousRank=rank;
    return {playerId:player.id,...(player.userId?{userId:player.userId}:{}),displayName:player.name,score:player.score,rank};
  });
  return {
    roomCode:room.code,
    contentVersion,
    finishedAt,
    settings:{modes:[...room.settings.modes],packageIds:[...room.settings.packageIds],totalRounds:room.settings.totalRounds},
    players,
  };
}
