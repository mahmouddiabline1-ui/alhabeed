import type { Sql } from "postgres";
import type { FinishedGameResult, GameHistoryItem, GameResultRepository, PlayerGameStats } from "../results/types.js";

export class PostgresGameResultRepository implements GameResultRepository {
  constructor(private readonly sql:Sql){}
  async saveOnce(result:FinishedGameResult):Promise<boolean>{
    return this.sql.begin(async transaction=>{
      const inserted=await transaction<{id:string}[]>`
        insert into game_results(room_code,content_version,result,finished_at)
        values (${result.roomCode},${result.contentVersion},${transaction.json({settings:result.settings,playerCount:result.players.length})},${new Date(result.finishedAt)})
        on conflict (room_code) do nothing returning id::text
      `;
      if(!inserted[0])return false;
      for(const player of result.players)await transaction`
        insert into game_result_players(result_id,player_id,user_id,display_name,score,rank)
        values (${inserted[0].id}::uuid,${player.playerId},${player.userId??null}::uuid,${player.displayName},${player.score},${player.rank})
      `;
      return true;
    });
  }
  async historyForUser(userId:string,limit:number):Promise<GameHistoryItem[]>{
    const rows=await this.sql<any[]>`
      select g.room_code,g.content_version,g.finished_at,g.result,p.player_id,p.display_name,p.score,p.rank,
        (select count(*)::integer from game_result_players all_players where all_players.result_id=g.id) as player_count
      from game_result_players p join game_results g on g.id=p.result_id
      where p.user_id=${userId}::uuid order by g.finished_at desc,g.id desc limit ${limit}
    `;
    return rows.map(row=>({roomCode:String(row.room_code).trim(),contentVersion:row.content_version,finishedAt:new Date(row.finished_at).getTime(),settings:row.result.settings,player:{playerId:row.player_id,userId,displayName:row.display_name,score:row.score,rank:row.rank},playerCount:row.player_count}));
  }
  async statsForUser(userId:string):Promise<PlayerGameStats>{
    const [row]=await this.sql<{
      games_played:number;
      wins:number;
      total_score:number;
      best_score:number;
      average_rank:string|null;
    }[]>`
      select count(*)::integer as games_played,
        count(*) filter (where rank=1)::integer as wins,
        coalesce(sum(score),0)::integer as total_score,
        coalesce(max(score),0)::integer as best_score,
        avg(rank) as average_rank
      from game_result_players
      where user_id=${userId}::uuid
    `;
    return {
      gamesPlayed:row?.games_played??0,
      wins:row?.wins??0,
      totalScore:row?.total_score??0,
      bestScore:row?.best_score??0,
      averageRank:row?.average_rank===null||row?.average_rank===undefined?null:Number(row.average_rank),
    };
  }
}
