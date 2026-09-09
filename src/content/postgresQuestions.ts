import type { Sql } from "postgres";
import type { ModeId, Question } from "../core/types.js";

interface QuestionRow { id:string; package_id:string; mode:string; prompt:string; answer:string; explanation:string; decoys:unknown; source_url:string|null }

export async function loadPublishedQuestions(sql:Sql):Promise<Question[]> {
  const rows=await sql<QuestionRow[]>`
    select id::text,pack_id as package_id,mode,prompt,answer,explanation,decoys,source_url
    from questions
    where review_state='published'
    order by pack_id,id
  `;
  return rows.map((row)=>({id:row.id,packageId:row.package_id,mode:row.mode as ModeId,prompt:row.prompt,correctAnswer:row.answer,explanation:row.explanation,decoys:Array.isArray(row.decoys)?row.decoys.filter((value):value is string=>typeof value==="string"):[],...(row.source_url?{sourceUrl:row.source_url}:{})}));
}
