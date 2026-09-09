import test from "node:test";
import assert from "node:assert/strict";
import { CommandGate } from "../src/server/commandGate.js";
import { GameError } from "../src/core/errors.js";

test("a retried command is recognized before its stale version is checked", () => {
  const gate=new CommandGate();
  assert.equal(gate.claim("ROOM:p1:cmd",3,3,100),"new");
  assert.equal(gate.claim("ROOM:p1:cmd",3,4,101),"duplicate");
});

test("a new command with an old room version is rejected", () => {
  const gate=new CommandGate();
  assert.throws(() => gate.claim("ROOM:p1:new",2,3,100), (error:unknown) => error instanceof GameError && error.code==="STALE_STATE");
});

test("a failed claim can be released and safely retried", () => {
  const gate=new CommandGate();
  assert.equal(gate.claim("ROOM:p1:cmd",1,1,100),"new");
  gate.release("ROOM:p1:cmd");
  assert.equal(gate.claim("ROOM:p1:cmd",1,1,101),"new");
});
