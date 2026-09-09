import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { openPostgres } from "./postgresRoomRepository.js";

const databaseUrl=process.env.DATABASE_URL;
if(!databaseUrl)throw new Error("DATABASE_URL is required to run migrations");
const sql=openPostgres(databaseUrl);
const directory=resolve(process.cwd(),"infra","migrations");

try {
  await sql`select pg_advisory_lock(704_221_981)`;
  await sql`create table if not exists schema_migrations (name text primary key,digest text not null,applied_at timestamptz not null default now())`;
  const files=(await readdir(directory)).filter(name=>/^\d+_.+\.sql$/u.test(name)).sort();
  const applied=await sql<{name:string;digest:string}[]>`select name,digest from schema_migrations`;
  const digests=new Map(applied.map(item=>[item.name,item.digest]));
  for(const name of files) {
    const contents=await readFile(resolve(directory,name),"utf8");
    const digest=createHash("sha256").update(contents).digest("hex");
    const old=digests.get(name);
    if(old&&old!==digest)throw new Error(`Applied migration ${name} has changed`);
    if(old)continue;
    await sql.begin(async transaction=>{
      await transaction.unsafe(contents);
      await transaction`insert into schema_migrations (name,digest) values (${name},${digest})`;
    });
    process.stdout.write(`Applied ${name}\n`);
  }
} finally {
  try { await sql`select pg_advisory_unlock(704_221_981)`; } finally { await sql.end({timeout:5}); }
}
