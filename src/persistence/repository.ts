import type { RoomState } from "../core/types.js";

export interface RoomRepository {
  loadAll(): Promise<RoomState[]>;
  save(room: RoomState): Promise<void>;
  delete(code: string): Promise<void>;
}

export class InMemoryRoomRepository implements RoomRepository {
  private readonly rooms = new Map<string, RoomState>();

  async loadAll(): Promise<RoomState[]> {
    return [...this.rooms.values()].map((room) => structuredClone(room));
  }

  async save(room: RoomState): Promise<void> {
    this.rooms.set(room.code, structuredClone(room));
  }

  async delete(code: string): Promise<void> {
    this.rooms.delete(code.toUpperCase());
  }
}
