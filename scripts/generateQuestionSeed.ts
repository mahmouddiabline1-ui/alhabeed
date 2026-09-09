import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { LOCAL_QUESTIONS, CATEGORIES } from "../client/src/localQuestions.ts";
import { normalizeArabic } from "../src/catalog/workflow.ts";

const quote=(value:string)=>`'${value.replace(/'/gu,"''")}'`;
const seen=new Set<string>();
const questions=LOCAL_QUESTIONS.filter(question=>{
  const key=`${question.category}:${normalizeArabic(question.prompt)}`;
  if(seen.has(key))return false;
  seen.add(key);return true;
});
const categories=[...new Set(questions.map(question=>question.category))];
const rows=questions.map(question=>`(${quote(question.category)},${quote(question.mode)},${quote(question.prompt)},${quote(normalizeArabic(question.prompt))},${quote(question.correct)},${quote(question.explanation)},${quote(JSON.stringify(question.decoys))}::jsonb,'published','ar-EG')`).join(",\n");
const packs=categories.map(category=>`(${quote(category)},${quote(category)},${quote(CATEGORIES[category].name)},'free','published')`).join(",\n");
const sql=`begin;
insert into packs (id,slug,title,access_tier,publish_state) values
${packs}
on conflict (id) do update set title=excluded.title,publish_state=excluded.publish_state;

insert into questions (pack_id,mode,prompt,normalized_prompt,answer,explanation,decoys,review_state,locale) values
${rows}
on conflict (pack_id,normalized_prompt) do update set mode=excluded.mode,prompt=excluded.prompt,answer=excluded.answer,explanation=excluded.explanation,decoys=excluded.decoys,review_state=excluded.review_state;
commit;
`;
const directory=resolve(process.cwd(),"infra","seed");
await mkdir(directory,{recursive:true});
await writeFile(resolve(directory,"questions.sql"),sql,"utf8");
process.stdout.write(JSON.stringify({input:LOCAL_QUESTIONS.length,published:questions.length,duplicatesRemoved:LOCAL_QUESTIONS.length-questions.length,packs:categories.length})+"\n");
