import { openPostgres } from "../src/persistence/postgresRoomRepository.ts";

const databaseUrl=process.env.DATABASE_URL;
if(!databaseUrl)throw new Error("DATABASE_URL is required");
const expectedRoom=process.argv[2]?.toUpperCase();
const roomCode=expectedRoom??"______";
const sql=openPostgres(databaseUrl);
try {
  const [summary]=await sql<{questions:number;packs:number;persisted_room:number;invalid_rooms:number;invalid_decoys:number;migrations:number;questions_with_source:number}[]>`
    select
      (select count(*)::int from questions where review_state='published') questions,
      (select count(*)::int from packs where publish_state='published') packs,
      (select count(*)::int from schema_migrations) migrations,
      (select count(*)::int from questions where review_state='published' and source_url is not null) questions_with_source,
      (select count(*)::int from questions where review_state='published' and mode<>'true_or_bluff' and jsonb_array_length(decoys)<2) invalid_decoys,
      (select count(*)::int from live_room_snapshots where code=${roomCode}) persisted_room,
      (select count(*)::int from live_room_snapshots where jsonb_typeof(state)<>'object' or state->>'code' is null) invalid_rooms
  `;
  if(!summary||summary.questions<1||summary.packs<1)throw new Error("Database content is incomplete");
  if(expectedRoom&&summary.persisted_room!==1)throw new Error("Created room was not persisted");
  if(summary.invalid_rooms)throw new Error(`Database contains ${summary.invalid_rooms} invalid room snapshots`);
  if(summary.invalid_decoys)throw new Error(`Database contains ${summary.invalid_decoys} questions without enough decoys`);
  process.stdout.write(JSON.stringify(summary)+"\n");
} finally {await sql.end({timeout:5});}
