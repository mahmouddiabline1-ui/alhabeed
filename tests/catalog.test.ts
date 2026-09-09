import test from "node:test";
import assert from "node:assert/strict";
import { CatalogWorkflow, normalizeArabic, validateMedia } from "../src/catalog/workflow.js";
import { GameError } from "../src/core/errors.js";

test("Arabic normalization catches punctuation, diacritics and numeral duplicates",()=>{
  assert.equal(normalizeArabic("أينَ بُنِيَ الهَرَم ١؟"),normalizeArabic("اين بني الهرم 1"));
  const catalog=new CatalogWorkflow();
  catalog.addDraft({packId:"egypt",mode:"habbedha",prompt:"أينَ بُنِيَ الهَرَم ١؟",answer:"سقارة",explanation:"مثال"});
  assert.throws(()=>catalog.addDraft({packId:"egypt",mode:"habbedha",prompt:"اين بني الهرم 1",answer:"سقارة",explanation:"مثال"}),(error:unknown)=>error instanceof GameError&&error.code==="DUPLICATE_QUESTION");
});

test("publishing requires source review, playtest, and licensed media",()=>{
  const catalog=new CatalogWorkflow();
  const question=catalog.addDraft({packId:"egypt",mode:"habbedha",prompt:"ما أقدم هرم حجري؟",answer:"هرم زوسر",explanation:"في سقارة"});
  assert.throws(()=>catalog.publish("egypt",[question.id],[],"publisher"));
  catalog.factCheck(question.id,"reviewer","https://example.org/source",1000);
  catalog.markPlaytested(question.id);
  const asset={id:"media-1",storageKey:"cards/egypt.webp",sha256:"a".repeat(64),width:800,height:1200,license:"owned" as const};
  catalog.addMedia(asset);
  const version=catalog.publish("egypt",[question.id],[asset.id],"publisher",2000);
  assert.equal(version.version,1);
  version.questionIds.length=0;
  assert.deepEqual(catalog.getVersion("egypt",1)?.questionIds,[question.id]);
});

test("CC BY media cannot publish without attribution",()=>{
  assert.throws(()=>validateMedia({id:"m",storageKey:"m",sha256:"b".repeat(64),width:1,height:1,license:"cc_by",sourceUrl:"https://example.org"}),(error:unknown)=>error instanceof GameError&&error.code==="ATTRIBUTION_REQUIRED");
});
