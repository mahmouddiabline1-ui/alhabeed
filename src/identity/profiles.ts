import { randomUUID } from "node:crypto";
import { z } from "zod";
import { GameError } from "../core/errors.js";
import { SessionService } from "./sessions.js";
import { AccessTokenService } from "./accessTokens.js";

const cleanText=/^[^\u0000-\u001f\u007f]+$/u;
export const profileInput=z.object({
  displayName:z.string().trim().min(2).max(24).regex(cleanText),
  selectedCharacterId:z.enum(["character-1","character-2","character-3","character-4","character-5","character-6","character-7","character-8","character-9","character-10","character-11","character-12"]),
}).strict();
export const anonymousAccountInput=profileInput.extend({deviceId:z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/u).optional()}).strict();

export interface Profile { userId:string;displayName:string;selectedCharacterId:string;locale:string;createdAt:number;updatedAt:number }
export interface ProfileRepository {
  createAnonymous(input:{displayName:string;selectedCharacterId:string}):Promise<Profile>;
  findByUserId(userId:string):Promise<Profile|undefined>;
  update(userId:string,input:{displayName:string;selectedCharacterId:string}):Promise<Profile|undefined>;
}
export class InMemoryProfileRepository implements ProfileRepository {
  private readonly profiles=new Map<string,Profile>();
  async createAnonymous(input:{displayName:string;selectedCharacterId:string}):Promise<Profile>{const now=Date.now();const value={userId:randomUUID(),...input,locale:"ar-EG",createdAt:now,updatedAt:now};this.profiles.set(value.userId,value);return structuredClone(value);}
  async findByUserId(userId:string){return structuredClone(this.profiles.get(userId));}
  async update(userId:string,input:{displayName:string;selectedCharacterId:string}){const old=this.profiles.get(userId);if(!old)return;const value={...old,...input,updatedAt:Date.now()};this.profiles.set(userId,value);return structuredClone(value);}
}

export class IdentityService {
  constructor(private readonly profiles:ProfileRepository,private readonly sessions:SessionService,private readonly access:AccessTokenService){}
  async createAnonymous(raw:unknown){
    const input=anonymousAccountInput.parse(raw); const profile=await this.profiles.createAnonymous(input);
    const deviceId=input.deviceId??randomUUID(); const issued=await this.sessions.issue(profile.userId,deviceId);
    return {profile,deviceId,accessToken:this.access.issue(profile.userId),refreshToken:issued.refreshToken,accessTokenExpiresInSeconds:900};
  }
  async refresh(refreshToken:string){const issued=await this.sessions.rotate(refreshToken);return {accessToken:this.access.issue(issued.session.userId),refreshToken:issued.refreshToken,accessTokenExpiresInSeconds:900};}
  async me(userId:string){const profile=await this.profiles.findByUserId(userId);if(!profile)throw new GameError("PROFILE_NOT_FOUND","Profile was not found");return profile;}
  async update(userId:string,raw:unknown){const input=profileInput.parse(raw);const profile=await this.profiles.update(userId,input);if(!profile)throw new GameError("PROFILE_NOT_FOUND","Profile was not found");return profile;}
  async logoutAll(userId:string){await this.sessions.logoutAll(userId);}
}
