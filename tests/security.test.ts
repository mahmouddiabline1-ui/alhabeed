import test from "node:test";
import assert from "node:assert/strict";
import { allowedOrigins, originAllowed, SocketRateLimiter } from "../src/server/security.js";
import { GameError } from "../src/core/errors.js";

test("CORS only accepts configured origins and non-browser requests", () => {
  const origins=allowedOrigins({NODE_ENV:"production",ALLOWED_ORIGINS:"https://game.example, https://preview.example"});
  assert.equal(originAllowed("https://game.example",origins),true);
  assert.equal(originAllowed("https://evil.example",origins),false);
  assert.equal(originAllowed(undefined,origins),true);
});

test("socket rate limiter resets by window and rejects floods", () => {
  const limiter=new SocketRateLimiter(2,1000);
  limiter.consume("ip",0);
  limiter.consume("ip",1);
  assert.throws(()=>limiter.consume("ip",2),(error:unknown)=>error instanceof GameError && error.code==="RATE_LIMITED");
  assert.doesNotThrow(()=>limiter.consume("ip",1000));
});
