import type { ModeId, Question } from "./types.js";
import { assertGame } from "./errors.js";

export class QuestionBank {
  constructor(private readonly questions: Question[]) {}

  pick(mode: ModeId, packages: string[], used: Set<string>, random = Math.random): Question {
    const candidates = this.questions.filter(
      (q) => q.mode === mode && packages.includes(q.packageId) && !used.has(q.id)
    );
    assertGame(candidates.length > 0, "NO_QUESTIONS", `No unused questions for ${mode}`);
    const usedPerPackage = new Map<string, number>();
    for (const id of used) {
      const previous = this.questions.find((q) => q.id === id);
      if (previous) usedPerPackage.set(previous.packageId, (usedPerPackage.get(previous.packageId) ?? 0) + 1);
    }
    const candidatePackages = [...new Set(candidates.map((q) => q.packageId))];
    const leastUsed = Math.min(...candidatePackages.map((id) => usedPerPackage.get(id) ?? 0));
    const balancedPackages = candidatePackages.filter((id) => (usedPerPackage.get(id) ?? 0) === leastUsed);
    const selectedPackage = balancedPackages[Math.floor(random() * balancedPackages.length)]!;
    const balancedCandidates = candidates.filter((q) => q.packageId === selectedPackage);
    return balancedCandidates[Math.floor(random() * balancedCandidates.length)]!;
  }

  get(id: string): Question {
    const question = this.questions.find((q) => q.id === id);
    assertGame(question, "QUESTION_NOT_FOUND", "Question not found");
    return question;
  }

  sample(modes:ModeId[],packages:string[],count:number,random=Math.random):Question[] {
    const picked:Question[]=[];
    const used=new Set<string>();
    for(let index=0;index<count;index++) {
      const availableModes=modes.filter(mode=>this.questions.some(question=>question.mode===mode&&packages.includes(question.packageId)&&!used.has(question.id)));
      if(!availableModes.length)break;
      const preferred=modes[index%modes.length]!;
      const mode=availableModes.includes(preferred)?preferred:availableModes[Math.floor(random()*availableModes.length)]!;
      const question=this.pick(mode,packages,used,random);
      picked.push(question);used.add(question.id);
    }
    return picked;
  }
}
