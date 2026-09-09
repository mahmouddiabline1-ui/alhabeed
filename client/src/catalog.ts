import type { ModeId } from "./types";

export type CategoryId =
  | "egypt" | "history" | "football" | "screen" | "food" | "science"
  | "music" | "technology" | "nature" | "world" | "egypt_landmarks" | "world_landmarks";

export interface LocalQuestion {
  id?:string;mode:ModeId;category:CategoryId;prompt:string;correct:string;decoys:string[];explanation:string;
  image?:{src:string;position:string;size?:string};
}

export const CATEGORIES:Record<CategoryId,{name:string;position:string;art?:string;size?:string}>={
  egypt:{name:"مصر والقعدة",position:"0% 0%"},history:{name:"تاريخ وغرائب",position:"50% 0%"},
  football:{name:"كورة وتشجيع",position:"100% 0%"},screen:{name:"سينما وتلفزيون",position:"0% 100%"},
  food:{name:"أكل ومزاج",position:"50% 100%"},science:{name:"علوم ومعلومات",position:"100% 100%"},
  music:{name:"مزيكا وسماع",position:"0% 50%",art:"pack-art-v2.png",size:"400% 100%"},
  technology:{name:"تكنولوجيا ونت",position:"33.333% 50%",art:"pack-art-v2.png",size:"400% 100%"},
  nature:{name:"حيوانات وطبيعة",position:"66.666% 50%",art:"pack-art-v2.png",size:"400% 100%"},
  world:{name:"حول العالم",position:"100% 50%",art:"pack-art-v2.png",size:"400% 100%"},
  egypt_landmarks:{name:"معالم مصر",position:"0% 0%",art:"landmarks-egypt-v1.png",size:"300% 200%"},
  world_landmarks:{name:"معالم العالم",position:"0% 0%",art:"landmarks-world-v1.png",size:"300% 200%"},
};
