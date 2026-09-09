import test from "node:test";
import assert from "node:assert/strict";
import { GuestTokenService } from "../src/security/guestTokens.js";
import { GameError } from "../src/core/errors.js";

const tokens=new GuestTokenService("a-secure-test-secret-that-is-over-thirty-two-bytes");

test("guest token binds a player to a room",()=>{
  const token=tokens.issue("ABC123","player-1",1_000);
  assert.equal(tokens.verify(token,"ABC123",2_000).playerId,"player-1");
  assert.throws(()=>tokens.verify(token,"ZZZ999",2_000),(e)=>e instanceof GameError&&e.code==="INVALID_SESSION");
});

test("guest token rejects tampering and expiry",()=>{
  const token=tokens.issue("ABC123","player-1",1_000);
  assert.throws(()=>tokens.verify(`${token}x`,"ABC123",2_000),(e)=>e instanceof GameError&&e.code==="INVALID_SESSION");
  assert.throws(()=>tokens.verify(token,"ABC123",31*24*60*60*1000),(e)=>e instanceof GameError&&e.code==="INVALID_SESSION");
});
