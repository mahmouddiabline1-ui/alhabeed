import { createHash, randomBytes, randomUUID } from "node:crypto";
import { GameError } from "../core/errors.js";

export interface RefreshSession {
  id:string;
  userId:string;
  deviceId:string;
  familyId:string;
  tokenHash:string;
  expiresAt:number;
  rotatedAt?:number;
  revokedAt?:number;
}

export interface SessionRepository {
  insert(session:RefreshSession):Promise<void>;
  findByTokenHash(hash:string):Promise<RefreshSession|undefined>;
  save(session:RefreshSession):Promise<void>;
  rotate(sessionId:string,replacement:RefreshSession,at:number):Promise<"rotated"|"reused"|"expired">;
  revokeFamily(familyId:string,at:number):Promise<void>;
  revokeUser(userId:string,at:number):Promise<void>;
}

export class InMemorySessionRepository implements SessionRepository {
  private readonly sessions=new Map<string,RefreshSession>();
  async insert(session:RefreshSession):Promise<void> { this.sessions.set(session.id,structuredClone(session)); }
  async findByTokenHash(hash:string):Promise<RefreshSession|undefined> { return structuredClone([...this.sessions.values()].find(item=>item.tokenHash===hash)); }
  async save(session:RefreshSession):Promise<void> { this.sessions.set(session.id,structuredClone(session)); }
  async rotate(id:string,replacement:RefreshSession,at:number):Promise<"rotated"|"reused"|"expired"> { const session=this.sessions.get(id);if(!session||session.expiresAt<=at)return "expired";if(session.rotatedAt||session.revokedAt){await this.revokeFamily(session.familyId,at);return "reused";}session.rotatedAt=at;this.sessions.set(replacement.id,structuredClone(replacement));return "rotated"; }
  async revokeFamily(familyId:string,at:number):Promise<void> { for (const session of this.sessions.values()) if (session.familyId===familyId) session.revokedAt=at; }
  async revokeUser(userId:string,at:number):Promise<void> { for (const session of this.sessions.values()) if (session.userId===userId) session.revokedAt=at; }
}

export class SessionService {
  constructor(
    private readonly repository:SessionRepository,
    private readonly now:()=>number=Date.now,
    private readonly lifetimeMs=30*24*60*60_000,
  ) {}

  async issue(userId:string,deviceId:string,familyId:string=randomUUID()):Promise<{refreshToken:string;session:RefreshSession}> {
    const refreshToken=randomBytes(32).toString("base64url");
    const session:RefreshSession={
      id:randomUUID(),userId,deviceId,familyId,
      tokenHash:this.hash(refreshToken),
      expiresAt:this.now()+this.lifetimeMs,
    };
    await this.repository.insert(session);
    return {refreshToken,session};
  }

  async rotate(refreshToken:string):Promise<{refreshToken:string;session:RefreshSession}> {
    const session=await this.repository.findByTokenHash(this.hash(refreshToken));
    if (!session) throw new GameError("INVALID_REFRESH_TOKEN","Refresh session was not found");
    const at=this.now();
    if (session.rotatedAt || session.revokedAt) {
      await this.repository.revokeFamily(session.familyId,at);
      throw new GameError("REFRESH_TOKEN_REUSE","Refresh token reuse detected; device sessions were revoked");
    }
    if (session.expiresAt <= at) throw new GameError("REFRESH_TOKEN_EXPIRED","Refresh session expired");
    const nextRefreshToken=randomBytes(32).toString("base64url");
    const replacement:RefreshSession={id:randomUUID(),userId:session.userId,deviceId:session.deviceId,familyId:session.familyId,tokenHash:this.hash(nextRefreshToken),expiresAt:at+this.lifetimeMs};
    const outcome=await this.repository.rotate(session.id,replacement,at);
    if(outcome==="expired")throw new GameError("REFRESH_TOKEN_EXPIRED","Refresh session expired");
    if(outcome==="reused")throw new GameError("REFRESH_TOKEN_REUSE","Refresh token reuse detected; device sessions were revoked");
    return {refreshToken:nextRefreshToken,session:replacement};
  }

  async logoutAll(userId:string):Promise<void> { await this.repository.revokeUser(userId,this.now()); }

  private hash(token:string):string { return createHash("sha256").update(token).digest("hex"); }
}
