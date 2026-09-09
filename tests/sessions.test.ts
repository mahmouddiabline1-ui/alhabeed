import test from "node:test";
import assert from "node:assert/strict";
import { InMemorySessionRepository, SessionService } from "../src/identity/sessions.js";
import { GameError } from "../src/core/errors.js";

test("refresh rotation replaces the token without storing the secret",async()=>{
  const repository=new InMemorySessionRepository();
  const service=new SessionService(repository,()=>1000,5000);
  const first=await service.issue("user-1","phone-1");
  assert.notEqual(first.session.tokenHash,first.refreshToken);
  const second=await service.rotate(first.refreshToken);
  assert.equal(second.session.familyId,first.session.familyId);
  assert.notEqual(second.refreshToken,first.refreshToken);
});

test("reuse of a rotated refresh token revokes its token family",async()=>{
  let now=1000;
  const repository=new InMemorySessionRepository();
  const service=new SessionService(repository,()=>now,5000);
  const first=await service.issue("user-1","phone-1");
  const second=await service.rotate(first.refreshToken);
  now=1100;
  await assert.rejects(()=>service.rotate(first.refreshToken),(error:unknown)=>error instanceof GameError&&error.code==="REFRESH_TOKEN_REUSE");
  await assert.rejects(()=>service.rotate(second.refreshToken),(error:unknown)=>error instanceof GameError&&error.code==="REFRESH_TOKEN_REUSE");
});

test("expired refresh tokens and logout-all cannot be rotated",async()=>{
  let now=1000;
  const repository=new InMemorySessionRepository();
  const service=new SessionService(repository,()=>now,100);
  const expired=await service.issue("user-1","phone-1");
  now=1100;
  await assert.rejects(()=>service.rotate(expired.refreshToken),(error:unknown)=>error instanceof GameError&&error.code==="REFRESH_TOKEN_EXPIRED");
  now=1200;
  const active=await service.issue("user-1","phone-2");
  await service.logoutAll("user-1");
  await assert.rejects(()=>service.rotate(active.refreshToken));
});
