import postgres, { type Sql } from "postgres";
import type { RoomState } from "../core/types.js";
import type { RoomRepository } from "./repository.js";

export class PostgresRoomRepository implements RoomRepository {
  constructor(private readonly sql:Sql) {}

  async loadAll():Promise<RoomState[]> {
    const rows=await this.sql<{state:RoomState}[]>`
      select state from live_room_snapshots where expires_at > now()
    `;
    return rows.map(row=>{
      const state=typeof row.state==="string"?JSON.parse(row.state) as RoomState:row.state;
      if(!state||typeof state!=="object"||!state.code)throw new Error("Invalid PostgreSQL room snapshot");
      return structuredClone(state);
    });
  }

  async save(room:RoomState):Promise<void> {
    await this.sql`
      insert into live_room_snapshots (code,version,state,expires_at,updated_at)
      values (${room.code},${room.version},${this.sql.json(JSON.parse(JSON.stringify(room)))},now()+interval '24 hours',now())
      on conflict (code) do update set
        version=excluded.version,
        state=excluded.state,
        expires_at=excluded.expires_at,
        updated_at=excluded.updated_at
      where live_room_snapshots.version <= excluded.version
    `;
  }

  async delete(code:string):Promise<void> {
    await this.sql`delete from live_room_snapshots where code=${code.toUpperCase()}`;
  }
}

export function openPostgres(databaseUrl:string):Sql {
  return postgres(databaseUrl,{ssl:"require",max:10,prepare:false,idle_timeout:20,connect_timeout:10});
}
