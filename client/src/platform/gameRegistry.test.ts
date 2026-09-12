import { describe, expect, it } from "vitest";
import { GAME_REGISTRY, gameById, type GameId } from "./gameRegistry";

describe("game registry", () => {
  it("keeps the stable four-game catalog order", () => {
    expect(GAME_REGISTRY.map((game) => game.id)).toEqual([
      "alhabeed",
      "district-race",
      "chess",
      "shedding",
    ]);
  });

  it("only exposes AlHabeed as playable in this phase", () => {
    expect(gameById("alhabeed")).toMatchObject({
      title: "الهَبِّيد",
      playerCount: { min: 3, max: 10, label: "3–10 لاعبين" },
    });
    expect(
      GAME_REGISTRY.filter((game) => game.availability.online === "playable").map(
        (game) => game.id,
      ),
    ).toEqual(["alhabeed"]);
    expect(
      GAME_REGISTRY.filter((game) => game.availability.local === "playable").map(
        (game) => game.id,
      ),
    ).toEqual(["alhabeed"]);
  });

  it("declares valid player ranges and only gives playable games play routes", () => {
    for (const game of GAME_REGISTRY) {
      expect(game.playerCount.min).toBeGreaterThanOrEqual(2);
      expect(game.playerCount.max).toBeGreaterThanOrEqual(game.playerCount.min);
      if (game.availability.local === "playable") {
        expect(game.routes.local).toBeDefined();
      } else {
        expect(game.routes.local).toBeUndefined();
      }
      if (game.availability.online === "playable") {
        expect(game.routes.online).toBeDefined();
      } else {
        expect(game.routes.online).toBeUndefined();
      }
    }
  });

  it("keeps slugs unique and resolves known games", () => {
    expect(new Set(GAME_REGISTRY.map((game) => game.slug)).size).toBe(
      GAME_REGISTRY.length,
    );
    expect(gameById("alhabeed").slug).toBe("alhabeed");
    expect(() => gameById("unknown" as GameId)).toThrow("Unknown game: unknown");
  });
});
