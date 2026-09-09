import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/server/config.js";

test("development config has safe operational defaults",()=>{
  const config=loadConfig({});
  assert.equal(config.port,3000);
  assert.equal(config.host,"0.0.0.0");
});

test("production refuses to start without durable storage and secrets",()=>{
  assert.throws(()=>loadConfig({NODE_ENV:"production"}),/SESSION_SECRET.*DATABASE_URL.*REDIS_URL.*METRICS_TOKEN.*ALLOWED_ORIGINS/u);
});

test("production config accepts explicit secrets and origins",()=>{
  const config=loadConfig({NODE_ENV:"production",SESSION_SECRET:"x".repeat(32),DATABASE_URL:"postgres://user:pass@example.com/db",REDIS_URL:"rediss://default:pass@example.com:6379",METRICS_TOKEN:"m".repeat(24),ALLOWED_ORIGINS:"https://game.example",PORT:"8080"});
  assert.equal(config.environment,"production");
  assert.equal(config.port,8080);
});
