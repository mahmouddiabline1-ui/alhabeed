import { openPostgres } from "../src/persistence/postgresRoomRepository.ts";

const databaseUrl=process.env.DATABASE_URL;
if(!databaseUrl)throw new Error("DATABASE_URL is required");
const codes=process.argv.slice(2).map(value=>value.toUpperCase());
if(!codes.length||codes.some(code=>!/^[A-Z0-9]{6}$/u.test(code)))throw new Error("Pass explicit six-character test room codes");
const sql=openPostgres(databaseUrl);
try {
  const deleted=await sql`delete from live_room_snapshots where code in ${sql(codes)} returning code`;
  process.stdout.write(JSON.stringify({deleted:deleted.map(row=>row.code)})+"\n");
} finally {await sql.end({timeout:5});}
