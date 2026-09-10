import test from "node:test";
import assert from "node:assert/strict";
import { AccessTokenService } from "../src/identity/accessTokens.js";
import { IdentityService, InMemoryProfileRepository } from "../src/identity/profiles.js";
import { InMemorySessionRepository, SessionService } from "../src/identity/sessions.js";
import { GameError } from "../src/core/errors.js";
import { readCookie, refreshCookie, refreshCookieName } from "../src/server/authHttp.js";

const secret="test-secret-that-is-at-least-thirty-two-bytes-long";

test("anonymous identity persists a real profile and never returns refresh token in profile",async()=>{
  const access=new AccessTokenService(secret,()=>1_000);
  const service=new IdentityService(new InMemoryProfileRepository(),new SessionService(new InMemorySessionRepository(),()=>1_000),access);
  const created=await service.createAnonymous({displayName:"  محمود  ",selectedCharacterId:"character-3",deviceId:"browser-device-1"});
  assert.equal(created.profile.displayName,"محمود");
  assert.equal((await service.me(access.verify(created.accessToken).sub)).selectedCharacterId,"character-3");
  assert.equal(Object.hasOwn(created.profile,"refreshToken"),false);
});

test("profile creation and update reject unsupported character ids and extra input",async()=>{
  const service=new IdentityService(new InMemoryProfileRepository(),new SessionService(new InMemorySessionRepository()),new AccessTokenService(secret));
  await assert.rejects(()=>service.createAnonymous({displayName:"محمود",selectedCharacterId:"admin",role:"admin"}));
  const created=await service.createAnonymous({displayName:"محمود",selectedCharacterId:"character-1"});
  await assert.rejects(()=>service.update(created.profile.userId,{displayName:"x",selectedCharacterId:"character-2"}));
});

test("access tokens reject tampering and expire after fifteen minutes",()=>{
  let now=1_000; const access=new AccessTokenService(secret,()=>now,900_000); const token=access.issue("user-1");
  assert.equal(access.verify(token).sub,"user-1");
  assert.throws(()=>access.verify(`${token}x`),(error:unknown)=>error instanceof GameError&&error.code==="INVALID_ACCESS_TOKEN");
  now=901_000;
  assert.throws(()=>access.verify(token),(error:unknown)=>error instanceof GameError&&error.code==="INVALID_ACCESS_TOKEN");
});

test("identity refresh rotation detects replay and revokes the replacement",async()=>{
  const repository=new InMemorySessionRepository(); const sessions=new SessionService(repository,()=>1_000);
  const service=new IdentityService(new InMemoryProfileRepository(),sessions,new AccessTokenService(secret,()=>1_000));
  const created=await service.createAnonymous({displayName:"لاعب",selectedCharacterId:"character-12"});
  const refreshed=await service.refresh(created.refreshToken);
  await assert.rejects(()=>service.refresh(created.refreshToken),(error:unknown)=>error instanceof GameError&&error.code==="REFRESH_TOKEN_REUSE");
  await assert.rejects(()=>service.refresh(refreshed.refreshToken));
});

test("logout-all actually revokes a rotated replacement token",async()=>{
  const repository=new InMemorySessionRepository(); const sessions=new SessionService(repository,()=>1_000);
  const service=new IdentityService(new InMemoryProfileRepository(),sessions,new AccessTokenService(secret,()=>1_000));
  const created=await service.createAnonymous({displayName:"لاعب",selectedCharacterId:"character-4"});
  const refreshed=await service.refresh(created.refreshToken);
  await service.logoutAll(created.profile.userId);
  await assert.rejects(()=>service.refresh(refreshed.refreshToken),(error:unknown)=>error instanceof GameError&&error.code==="REFRESH_TOKEN_REUSE");
});

test("refresh cookie supports credentialed requests across Pages and Railway",()=>{
  const header=refreshCookie("opaque-token");
  assert.match(header,/Path=\/api\/auth/);
  assert.match(header,/HttpOnly/);
  assert.match(header,/Secure/);
  assert.match(header,/SameSite=None/);
  assert.doesNotMatch(header,/SameSite=Lax/);
  assert.equal(readCookie(`${header}; another=value`,refreshCookieName),"opaque-token");
});
