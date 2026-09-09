import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { openPostgres } from "../src/persistence/postgresRoomRepository.ts";

const databaseUrl=process.env.DATABASE_URL;
if(!databaseUrl)throw new Error("DATABASE_URL is required");
const sql=openPostgres(databaseUrl);
try {
  const contents=(await readFile(resolve(process.cwd(),"infra","seed","questions.sql"),"utf8"))
    .replace(/^\s*begin;\s*/iu,"").replace(/\s*commit;\s*$/iu,"");
  await sql.begin(async transaction=>{ await transaction.unsafe(contents); });
  const [summary]=await sql<{packs:number;questions:number}[]>`
    select (select count(*)::int from packs where publish_state='published') packs,
           (select count(*)::int from questions where review_state='published') questions
  `;
  process.stdout.write(JSON.stringify(summary)+"\n");
} finally { await sql.end({timeout:5}); }
