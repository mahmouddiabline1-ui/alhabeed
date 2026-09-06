import { randomUUID } from "node:crypto";
import type { GameEngine } from "../core/engine.js";
import type { RoomRepository } from "../persistence/repository.js";
import type { Player, RoomSettings, RoomState } from "../core/types.js";

export class GameService {
  constructor(readonly engine: GameEngine, private readonly repository: RoomRepository) {}

  async initialize(): Promise<void> { this.engine.restore(await this.repository.loadAll()); }
  newPlayer(name: string): Pick<Player, "id" | "name"> { return { id: randomUUID(), name }; }
  async persist(room: RoomState): Promise<RoomState> { await this.repository.save(room); return room; }
  async create(name: string, settings: Partial<RoomSettings> = {}) { const p = this.newPlayer(name); return { player: p, room: await this.persist(this.engine.createRoom(p, settings)) }; }
  async tickAll(): Promise<RoomState[]> {
    const changed: RoomState[] = [];
    for (const old of this.engine.listRooms()) {
      const next = this.engine.advanceExpired(old.code);
      if (next.version !== old.version) { await this.persist(next); changed.push(next); }
    }
    return changed;
  }
}
