import type { ModeId, Question } from "./types.js";
import { assertGame } from "./errors.js";

export class QuestionBank {
  constructor(private readonly questions: Question[]) {}

  pick(mode: ModeId, packages: string[], used: Set<string>, random = Math.random): Question {
    const candidates = this.questions.filter(
      (q) => q.mode === mode && packages.includes(q.packageId) && !used.has(q.id)
    );
    assertGame(candidates.length > 0, "NO_QUESTIONS", `No unused questions for ${mode}`);
    return candidates[Math.floor(random() * candidates.length)]!;
  }

  get(id: string): Question {
    const question = this.questions.find((q) => q.id === id);
    assertGame(question, "QUESTION_NOT_FOUND", "Question not found");
    return question;
  }
}
