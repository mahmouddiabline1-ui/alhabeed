import type { Sql } from "postgres";
import type { Profile,ProfileRepository } from "../identity/profiles.js";
import type { RefreshSession,SessionRepository } from "../identity/sessions.js";

type ProfileRow={user_id:string;display_name:string;selected_character_id:string|null;locale:string;created_at:Date;updated_at:Date};
const mapProfile=(row:ProfileRow):Profile=>({userId:row.user_id,displayName:row.display_name,selectedCharacterId:row.selected_character_id??"character-1",locale:row.locale,createdAt:new Date(row.created_at).getTime(),updatedAt:new Date(row.updated_at).getTime()});

export class PostgresProfileRepository implements ProfileRepository {
  constructor(private readonly sql:Sql){}
  async createAnonymous(input:{displayName:string;selectedCharacterId:string}):Promise<Profile>{
    return this.sql.begin(async tx=>{
      const [user]=await tx<{id:string;locale:string;created_at:Date}[]>`insert into users default values returning id,locale,created_at`;
      const [profile]=await tx<ProfileRow[]>`insert into profiles (user_id,display_name,selected_character_id) values (${user.id},${input.displayName},${input.selectedCharacterId}) returning user_id,display_name,selected_character_id,${user.locale}::text as locale,${user.created_at}::timestamptz as created_at,updated_at`;
      return mapProfile(profile);
    });
  }
  async findByUserId(userId:string):Promise<Profile|undefined>{const [row]=await this.sql<ProfileRow[]>`select p.user_id,p.display_name,p.selected_character_id,u.locale,u.created_at,p.updated_at from profiles p join users u on u.id=p.user_id where p.user_id=${userId} and u.status='active'`;return row?mapProfile(row):undefined;}
  async update(userId:string,input:{displayName:string;selectedCharacterId:string}):Promise<Profile|undefined>{const [row]=await this.sql<ProfileRow[]>`update profiles p set display_name=${input.displayName},selected_character_id=${input.selectedCharacterId},updated_at=now() from users u where p.user_id=${userId} and u.id=p.user_id and u.status='active' returning p.user_id,p.display_name,p.selected_character_id,u.locale,u.created_at,p.updated_at`;return row?mapProfile(row):undefined;}
}

type SessionRow={id:string;user_id:string;device_id:string;family_id:string;token_hash:string;expires_at:Date;rotated_at:Date|null;revoked_at:Date|null};
const mapSession=(row:SessionRow):RefreshSession=>({id:row.id,userId:row.user_id,deviceId:row.device_id,familyId:row.family_id,tokenHash:row.token_hash,expiresAt:new Date(row.expires_at).getTime(),rotatedAt:row.rotated_at?new Date(row.rotated_at).getTime():undefined,revokedAt:row.revoked_at?new Date(row.revoked_at).getTime():undefined});
export class PostgresSessionRepository implements SessionRepository {
  constructor(private readonly sql:Sql){}
  async insert(s:RefreshSession){await this.sql`insert into sessions (id,user_id,device_id,refresh_token_hash,family_id,expires_at) values (${s.id},${s.userId},${s.deviceId},${Buffer.from(s.tokenHash,"hex")},${s.familyId},${new Date(s.expiresAt)})`;}
  async findByTokenHash(hash:string){const [row]=await this.sql<SessionRow[]>`select id,user_id,device_id,family_id,encode(refresh_token_hash,'hex') token_hash,expires_at,rotated_at,revoked_at from sessions where refresh_token_hash=${Buffer.from(hash,"hex")}`;return row?mapSession(row):undefined;}
  async save(s:RefreshSession){await this.sql`update sessions set rotated_at=${s.rotatedAt?new Date(s.rotatedAt):null},revoked_at=${s.revokedAt?new Date(s.revokedAt):null} where id=${s.id}`;}
  async rotate(id:string,replacement:RefreshSession,at:number):Promise<"rotated"|"reused"|"expired">{
    return this.sql.begin(async tx=>{
      const [current]=await tx<{family_id:string;expires_at:Date;rotated_at:Date|null;revoked_at:Date|null}[]>`select family_id,expires_at,rotated_at,revoked_at from sessions where id=${id} for update`;
      if(!current||new Date(current.expires_at).getTime()<=at)return "expired";
      if(current.rotated_at||current.revoked_at){await tx`update sessions set revoked_at=coalesce(revoked_at,${new Date(at)}) where family_id=${current.family_id}`;return "reused";}
      await tx`update sessions set rotated_at=${new Date(at)} where id=${id}`;
      await tx`insert into sessions (id,user_id,device_id,refresh_token_hash,family_id,expires_at) values (${replacement.id},${replacement.userId},${replacement.deviceId},${Buffer.from(replacement.tokenHash,"hex")},${replacement.familyId},${new Date(replacement.expiresAt)})`;
      return "rotated";
    });
  }
  async revokeFamily(familyId:string,at:number){await this.sql`update sessions set revoked_at=coalesce(revoked_at,${new Date(at)}) where family_id=${familyId}`;}
  async revokeUser(userId:string,at:number){await this.sql`update sessions set revoked_at=coalesce(revoked_at,${new Date(at)}) where user_id=${userId}`;}
}
