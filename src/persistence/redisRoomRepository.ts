import type { RedisClientType } from "redis";
import type { RoomState } from "../core/types.js";
import type { RoomRepository } from "./repository.js";

const roomKey=(code:string)=>`alhabeed:room:${code.toUpperCase()}`;
const roomIndex="alhabeed:rooms:active";

export class RedisRoomRepository implements RoomRepository {
  constructor(private readonly redis:RedisClientType,private readonly ttlSeconds=24*60*60) {}
  async loadAll():Promise<RoomState[]> {
    const codes=await this.redis.sMembers(roomIndex);
    if(!codes.length)return [];
    const values=await this.redis.mGet(codes.map(roomKey));
    const rooms:RoomState[]=[];const expired:string[]=[];
    values.forEach((value,index)=>{if(value)rooms.push(JSON.parse(value) as RoomState);else expired.push(codes[index]!);});
    if(expired.length)await this.redis.sRem(roomIndex,expired);
    return rooms;
  }
  async save(room:RoomState):Promise<void> {
    await this.redis.eval(`
      local old=redis.call('GET',KEYS[1])
      if old then
        local decoded=cjson.decode(old)
        if tonumber(decoded.version)>tonumber(ARGV[1]) then return 0 end
      end
      redis.call('SET',KEYS[1],ARGV[2],'EX',ARGV[3])
      redis.call('SADD',KEYS[2],ARGV[4])
      return 1
    `,{keys:[roomKey(room.code),roomIndex],arguments:[String(room.version),JSON.stringify(room),String(this.ttlSeconds),room.code]});
  }
  async delete(code:string):Promise<void> {
    const normalized=code.toUpperCase();
    await this.redis.multi().del(roomKey(normalized)).sRem(roomIndex,normalized).exec();
  }
}

export class RedisRoomLease {
  constructor(private readonly redis:RedisClientType,private readonly ttlMs=5000) {}
  async acquire(code:string,owner:string):Promise<boolean> {
    return (await this.redis.set(`alhabeed:lease:${code.toUpperCase()}`,owner,{NX:true,PX:this.ttlMs}))==="OK";
  }
  async renew(code:string,owner:string):Promise<boolean> {
    return Number(await this.redis.eval(`if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('PEXPIRE',KEYS[1],ARGV[2]) else return 0 end`,{keys:[`alhabeed:lease:${code.toUpperCase()}`],arguments:[owner,String(this.ttlMs)]}))===1;
  }
  async release(code:string,owner:string):Promise<boolean> {
    return Number(await this.redis.eval(`if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end`,{keys:[`alhabeed:lease:${code.toUpperCase()}`],arguments:[owner]}))===1;
  }
}
