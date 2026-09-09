import { randomUUID } from "node:crypto";
import { GameError } from "../core/errors.js";
import type { ModeId } from "../core/types.js";

export type ReviewState="draft"|"fact_checked"|"playtested"|"published"|"retired";
export interface CatalogQuestion {
  id:string;packId:string;mode:ModeId;prompt:string;answer:string;explanation:string;
  sourceUrl?:string;reviewerId?:string;reviewedAt?:number;state:ReviewState;version:number;
}
export interface MediaAsset {
  id:string;storageKey:string;sha256:string;width:number;height:number;
  license:"owned"|"cc0"|"cc_by"|"licensed";sourceUrl?:string;attribution?:string;
}
export interface PackVersion {packId:string;version:number;questionIds:string[];mediaIds:string[];publishedAt:number;publisherId:string}

export function normalizeArabic(value:string):string {
  const digits:Record<string,string>={"٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9","۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9"};
  return value.normalize("NFKD").replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/gu,"").replace(/[أإآٱ]/gu,"ا").replace(/ى/gu,"ي").replace(/ة/gu,"ه").replace(/ؤ/gu,"و").replace(/ئ/gu,"ي").replace(/[٠-٩۰-۹]/gu,char=>digits[char]!).replace(/ـ/gu,"").replace(/[^\p{L}\p{N}]+/gu," ").trim().toLowerCase();
}

export function validateMedia(asset:MediaAsset):void {
  if (!/^[a-f0-9]{64}$/u.test(asset.sha256)) throw new GameError("INVALID_MEDIA_DIGEST","Media requires a SHA-256 digest");
  if (!Number.isInteger(asset.width)||!Number.isInteger(asset.height)||asset.width<1||asset.height<1) throw new GameError("INVALID_MEDIA_SIZE","Media dimensions are invalid");
  if (asset.license==="cc_by"&&!asset.attribution?.trim()) throw new GameError("ATTRIBUTION_REQUIRED","CC BY media requires attribution");
  if (asset.license!=="owned"&&!asset.sourceUrl?.startsWith("https://")) throw new GameError("MEDIA_SOURCE_REQUIRED","Licensed media requires an HTTPS source");
}

export class CatalogWorkflow {
  private readonly questions=new Map<string,CatalogQuestion>();
  private readonly promptIndex=new Map<string,string>();
  private readonly media=new Map<string,MediaAsset>();
  private readonly versions=new Map<string,PackVersion[]>();

  addDraft(input:Omit<CatalogQuestion,"id"|"state"|"version">):CatalogQuestion {
    const normalized=normalizeArabic(input.prompt);
    if (this.promptIndex.has(normalized)) throw new GameError("DUPLICATE_QUESTION","A normalized copy of this question already exists");
    const question:CatalogQuestion={...input,id:randomUUID(),state:"draft",version:1};
    this.questions.set(question.id,question);this.promptIndex.set(normalized,question.id);
    return structuredClone(question);
  }
  factCheck(id:string,reviewerId:string,sourceUrl:string,at=Date.now()):CatalogQuestion {
    const question=this.question(id);
    if (question.state!=="draft") throw new GameError("INVALID_REVIEW_STATE","Only drafts can be fact checked");
    if (!sourceUrl.startsWith("https://")) throw new GameError("SOURCE_REQUIRED","A factual HTTPS source is required");
    Object.assign(question,{state:"fact_checked" as const,reviewerId,sourceUrl,reviewedAt:at});
    return structuredClone(question);
  }
  markPlaytested(id:string):CatalogQuestion {
    const question=this.question(id);
    if (question.state!=="fact_checked") throw new GameError("INVALID_REVIEW_STATE","Fact check is required before playtest approval");
    question.state="playtested";return structuredClone(question);
  }
  addMedia(asset:MediaAsset):void { validateMedia(asset);this.media.set(asset.id,structuredClone(asset)); }
  publish(packId:string,questionIds:string[],mediaIds:string[],publisherId:string,at=Date.now()):PackVersion {
    if (!questionIds.length) throw new GameError("EMPTY_PACK","A published pack needs questions");
    for (const id of questionIds) { const q=this.question(id);if(q.packId!==packId||q.state!=="playtested") throw new GameError("QUESTION_NOT_READY","Every question must belong to the pack and be playtested"); }
    for (const id of mediaIds) if(!this.media.has(id)) throw new GameError("MEDIA_NOT_READY","Every media asset must have a valid license record");
    const versions=this.versions.get(packId)??[];
    const version:PackVersion={packId,version:versions.length+1,questionIds:[...questionIds],mediaIds:[...mediaIds],publishedAt:at,publisherId};
    versions.push(structuredClone(version));this.versions.set(packId,versions);
    for (const id of questionIds) this.question(id).state="published";
    return structuredClone(version);
  }
  getVersion(packId:string,version:number):PackVersion|undefined { return structuredClone(this.versions.get(packId)?.find(item=>item.version===version)); }
  private question(id:string):CatalogQuestion { const value=this.questions.get(id);if(!value)throw new GameError("QUESTION_NOT_FOUND","Question not found");return value; }
}
