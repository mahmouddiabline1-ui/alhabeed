import type { ModeId } from "./types";

export type CategoryId =
  | "egypt" | "history" | "football" | "screen" | "food" | "science"
  | "music" | "technology" | "nature" | "world" | "egypt_landmarks" | "world_landmarks"
  | "childhood_cartoon" | "gaming" | "cars" | "world_football" | "flags" | "riddles"
  | "medicine" | "inventions" | "ramadan" | "celebrities" | "strange_animals" | "travel";

export interface LocalQuestion {
  id?:string;mode:ModeId;category:CategoryId;prompt:string;correct:string;decoys:string[];explanation:string;
  image?:{src:string;position:string;size?:string};
}

export const CATEGORIES:Record<CategoryId,{name:string;position:string;art?:string;size?:string;vip?:boolean}>={
  egypt:{name:"مصر والقعدة",position:"0% 0%"},history:{name:"تاريخ وغرائب",position:"50% 0%"},
  football:{name:"كورة وتشجيع",position:"100% 0%"},screen:{name:"سينما وتلفزيون",position:"0% 100%"},
  food:{name:"أكل ومزاج",position:"50% 100%"},science:{name:"علوم ومعلومات",position:"100% 100%"},
  music:{name:"مزيكا وسماع",position:"0% 50%",art:"pack-art-v2.png",size:"400% 100%"},
  technology:{name:"تكنولوجيا ونت",position:"33.333% 50%",art:"pack-art-v2.png",size:"400% 100%"},
  nature:{name:"حيوانات وطبيعة",position:"66.666% 50%",art:"pack-art-v2.png",size:"400% 100%"},
  world:{name:"حول العالم",position:"100% 50%",art:"pack-art-v2.png",size:"400% 100%"},
  egypt_landmarks:{name:"معالم مصر",position:"0% 0%",art:"landmarks-egypt-v1.png",size:"300% 200%"},
  world_landmarks:{name:"معالم العالم",position:"0% 0%",art:"landmarks-world-v1.png",size:"300% 200%"},
  childhood_cartoon:{name:"كرتون الطفولة",position:"0% 0%",art:"vip-card-art-v1.png",size:"400% 300%",vip:true},
  gaming:{name:"ألعاب وجيمينج",position:"33.333% 0%",art:"vip-card-art-v1.png",size:"400% 300%",vip:true},
  cars:{name:"عالم السيارات",position:"66.666% 0%",art:"vip-card-art-v1.png",size:"400% 300%",vip:true},
  world_football:{name:"كورة عالمية",position:"100% 0%",art:"vip-card-art-v1.png",size:"400% 300%",vip:true},
  flags:{name:"دول وأعلام",position:"0% 50%",art:"vip-card-art-v1.png",size:"400% 300%",vip:true},
  riddles:{name:"ألغاز وذكاء",position:"33.333% 50%",art:"vip-card-art-v1.png",size:"400% 300%",vip:true},
  medicine:{name:"طب وجسم الإنسان",position:"66.666% 50%",art:"vip-card-art-v1.png",size:"400% 300%",vip:true},
  inventions:{name:"اختراعات غيرت الدنيا",position:"100% 50%",art:"vip-card-art-v1.png",size:"400% 300%",vip:true},
  ramadan:{name:"رمضان زمان",position:"0% 100%",art:"vip-card-art-v1.png",size:"400% 300%",vip:true},
  celebrities:{name:"مشاهير وسوشيال",position:"33.333% 100%",art:"vip-card-art-v1.png",size:"400% 300%",vip:true},
  strange_animals:{name:"حيوانات عجيبة",position:"66.666% 100%",art:"vip-card-art-v1.png",size:"400% 300%",vip:true},
  travel:{name:"سفر ومغامرات",position:"100% 100%",art:"vip-card-art-v1.png",size:"400% 300%",vip:true},
};
