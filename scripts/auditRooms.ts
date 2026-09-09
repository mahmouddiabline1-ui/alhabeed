import { openPostgres } from "../src/persistence/postgresRoomRepository.ts";

const databaseUrl=process.env.DATABASE_URL;
if(!databaseUrl)throw new Error("DATABASE_URL is required");
const sql=openPostgres(databaseUrl);
try {
  const rooms=await sql<{code:string;version:number;phase:string;players:unknown}[]>`
    select code,version,state->>'phase' as phase,
      coalesce((select jsonb_agg(player->>'name') from jsonb_each(state->'players') entry(key,player)),'[]'::jsonb) as players
    from live_room_snapshots
    order by updated_at desc
  `;
  process.stdout.write(JSON.stringify({rooms})+"\n");
} finally {await sql.end({timeout:5});}
