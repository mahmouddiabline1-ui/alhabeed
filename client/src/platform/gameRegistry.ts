import { GAME_IDS, type GameId } from "@alhabeed/contracts/games";

export { GAME_IDS } from "@alhabeed/contracts/games";
export type { GameId } from "@alhabeed/contracts/games";

export type ReleaseStatus = "playable" | "coming-soon";

export interface GameDefinition {
  id: GameId;
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  playerCount: { min: number; max: number; label: string };
  availability: { local: ReleaseStatus; online: ReleaseStatus };
  routes: { overview: string; local?: string; online?: string };
  accent: string;
  coverAssetId: string;
}

export const GAME_REGISTRY: readonly GameDefinition[] = [
  {
    id: "alhabeed",
    slug: "alhabeed",
    title: "الهَبِّيد",
    eyebrow: "لعبة القعدة الأصلية",
    description: "أسئلة سريعة، إجابات جريئة، وضحك كتير مع الصحاب.",
    playerCount: { min: 3, max: 10, label: "3–10 لاعبين" },
    availability: { local: "playable", online: "playable" },
    routes: {
      overview: "/games/alhabeed",
      local: "/games/alhabeed/local",
      online: "/games/alhabeed/create",
    },
    accent: "#e95d3f",
    coverAssetId: "alhabeed-cover",
  },
  {
    id: "district-race",
    slug: "district-race",
    title: "سباق اللِّمّة",
    eyebrow: "لعبة سباق على الطاولة",
    description: "حرّك القطع، خُد الاختصارات، ووصّل فريقك للنهاية.",
    playerCount: { min: 2, max: 4, label: "2–4 لاعبين" },
    availability: { local: "coming-soon", online: "coming-soon" },
    routes: { overview: "/games/district-race" },
    accent: "#2b8c8c",
    coverAssetId: "district-race-cover",
  },
  {
    id: "chess",
    slug: "chess",
    title: "الشطرنج",
    eyebrow: "قريبًا",
    description: "مباراة هادئة، نقلة محسوبة، وتحدٍّ جديد في كل مرة.",
    playerCount: { min: 2, max: 2, label: "لاعبان" },
    availability: { local: "coming-soon", online: "coming-soon" },
    routes: { overview: "/games/chess" },
    accent: "#5c4b8a",
    coverAssetId: "chess-cover",
  },
  {
    id: "shedding",
    slug: "shedding",
    title: "ورق اللِّمّة",
    eyebrow: "قريبًا",
    description: "خلّص ورقك الأول، واقرأ اللعب قبل ما يقرأك.",
    playerCount: { min: 2, max: 6, label: "2–6 لاعبين" },
    availability: { local: "coming-soon", online: "coming-soon" },
    routes: { overview: "/games/shedding" },
    accent: "#c17d32",
    coverAssetId: "shedding-cover",
  },
];

if (GAME_REGISTRY.length !== GAME_IDS.length || GAME_REGISTRY.some((game, index) => game.id !== GAME_IDS[index])) {
  throw new Error("Game registry is out of sync with shared game contracts");
}

export function gameById(id: GameId): GameDefinition {
  const game = GAME_REGISTRY.find((entry) => entry.id === id);
  if (!game) {
    throw new Error(`Unknown game: ${id}`);
  }
  return game;
}
