import { GameError } from "../core/errors.js";

type Entry = { expiresAt:number };

/** Prevents retries from applying a game command twice and rejects stale clients. */
export class CommandGate {
  private readonly claimed = new Map<string,Entry>();

  constructor(private readonly ttlMs = 10 * 60_000, private readonly maxEntries = 10_000) {}

  claim(key:string, expectedVersion:number, currentVersion:number, now = Date.now()):"new"|"duplicate" {
    this.prune(now);
    if (this.claimed.has(key)) return "duplicate";
    if (expectedVersion !== currentVersion) {
      throw new GameError("STALE_STATE", `Expected room version ${expectedVersion}, current version is ${currentVersion}`);
    }
    this.claimed.set(key,{expiresAt:now+this.ttlMs});
    if (this.claimed.size > this.maxEntries) this.claimed.delete(this.claimed.keys().next().value!);
    return "new";
  }

  release(key:string):void { this.claimed.delete(key); }

  private prune(now:number):void {
    for (const [key,entry] of this.claimed) if (entry.expiresAt <= now) this.claimed.delete(key);
  }
}
