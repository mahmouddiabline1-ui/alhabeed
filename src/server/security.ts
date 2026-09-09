import { GameError } from "../core/errors.js";

const productionOrigins = ["https://mahmouddiabline1-ui.github.io"];
const localOrigins = ["http://127.0.0.1:5173", "http://localhost:5173"];

export function allowedOrigins(env:NodeJS.ProcessEnv = process.env):Set<string> {
  const configured=(env.ALLOWED_ORIGINS ?? "").split(",").map(value=>value.trim()).filter(Boolean);
  const defaults=env.NODE_ENV === "production" ? productionOrigins : [...productionOrigins,...localOrigins];
  return new Set([...defaults,...configured]);
}

export function originAllowed(origin:string|undefined, origins=allowedOrigins()):boolean {
  return origin === undefined || origins.has(origin);
}

export class SocketRateLimiter {
  private readonly buckets=new Map<string,{count:number;resetsAt:number}>();
  constructor(private readonly limit=60,private readonly windowMs=60_000) {}

  consume(key:string,now=Date.now()):void {
    const bucket=this.buckets.get(key);
    if (!bucket || bucket.resetsAt <= now) {
      this.buckets.set(key,{count:1,resetsAt:now+this.windowMs});
      return;
    }
    bucket.count += 1;
    if (bucket.count > this.limit) throw new GameError("RATE_LIMITED","Too many socket commands; retry shortly");
  }
}
