import { beforeEach, describe, expect, it } from "vitest";
import { clearAlHabeedSession, readAlHabeedSession, saveAlHabeedSession } from "./session";

describe("AlHabeed session storage", () => {
  beforeEach(() => localStorage.clear());

  it("reads the current reconnect payload and preserves its token", () => {
    const current = { code: "A1B2C3", playerId: "p1", name: "محمود", token: "signed-token" };
    localStorage.setItem("alhabeed:session", JSON.stringify(current));
    expect(readAlHabeedSession()).toEqual(current);
  });

  it("rejects malformed payloads and can clear a session", () => {
    localStorage.setItem("alhabeed:session", "{");
    expect(readAlHabeedSession()).toBeNull();
    saveAlHabeedSession({ code: "A1B2C3", playerId: "p1", name: "محمود", token: "t" });
    clearAlHabeedSession();
    expect(localStorage.getItem("alhabeed:session")).toBeNull();
  });
});
