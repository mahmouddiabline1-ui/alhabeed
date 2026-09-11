import { randomUUID } from "node:crypto";
import type { GameEngine } from "../core/engine.js";
import type { RoomRepository } from "../persistence/repository.js";
import type { Player, RoomSettings, RoomState } from "../core/types.js";
import type { GameResultRepository } from "../results/types.js";
import { resultFromFinishedRoom } from "../results/gameResults.js";

export class GameService {
  constructor(readonly engine: GameEngine, private readonly repository: RoomRepository, private readonly results?:GameResultRepository, private readonly contentVersion="seed") {}

  async initialize(): Promise<void> { this.engine.restore(await this.repository.loadAll()); }
  newPlayer(name: string,userId?:string): Pick<Player, "id" | "name" | "userId"> { return { id: randomUUID(), name, ...(userId?{userId}:{}) }; }
  async persist(room: RoomState): Promise<RoomState> { await this.repository.save(room); if(room.phase==="finished"&&this.results)await this.results.saveOnce(resultFromFinishedRoom(room,this.contentVersion)); return room; }
  async create(name: string, settings: Partial<RoomSettings> = {},userId?:string) { const p = this.newPlayer(name,userId); return { player: p, room: await this.persist(this.engine.createRoom(p, settings)) }; }
  async history(userId:string){return this.results?.historyForUser(userId,20)??[];}
  async stats(userId:string){return this.results?.statsForUser(userId)??{gamesPlayed:0,wins:0,totalScore:0,bestScore:0,averageRank:null};}
  async tickAll(): Promise<RoomState[]> {
    const changed: RoomState[] = [];
    for (const old of this.engine.listRooms()) {
      const next = this.engine.advanceExpired(old.code);
      if (next.version !== old.version) { await this.persist(next); changed.push(next); }
    }
    return changed;
  }
}
