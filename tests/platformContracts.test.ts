import assert from "node:assert/strict";
import test from "node:test";
import { PROTOCOL_VERSION, UNSUPPORTED_PROTOCOL, roomCommandEnvelopeSchema, roomMemberSchema } from "@alhabeed/contracts";

test("platform contracts accept strict protocol v2 command envelopes", () => {
  assert.equal(PROTOCOL_VERSION, 2);
  const parsed = roomCommandEnvelopeSchema.parse({
    protocolVersion: 2,
    gameId: "alhabeed",
    roomCode: "A1B2C3",
    commandId: "00000000-0000-4000-8000-000000000001",
    expectedVersion: 7,
    payload: {},
  });
  assert.equal(parsed.gameId, "alhabeed");
});

test("unsupported protocol errors advertise the accepted version range", () => {
  assert.deepEqual(UNSUPPORTED_PROTOCOL, {
    code: "UNSUPPORTED_PROTOCOL",
    message: "This client does not support the room protocol version.",
    minimum: PROTOCOL_VERSION,
    maximum: PROTOCOL_VERSION,
  });
});

test("platform contracts reject unsupported protocol versions and unknown fields", () => {
  assert.throws(() => roomCommandEnvelopeSchema.parse({ protocolVersion: 3 }), /validation|Invalid input/u);
  assert.throws(() => roomCommandEnvelopeSchema.parse({
    protocolVersion: 2,
    gameId: "alhabeed",
    roomCode: "A1B2C3",
    commandId: "00000000-0000-4000-8000-000000000001",
    expectedVersion: 7,
    payload: {},
    extra: true,
  }), /validation|Unrecognized key|Invalid input/u);
});

test("public room members do not accept account identifiers", () => {
  assert.throws(() => roomMemberSchema.parse({
    playerId: "p1",
    userId: "private-account",
    displayName: "محمود",
    connected: true,
    joinedAt: 1,
  }), /Unrecognized key|Invalid input/u);
});
