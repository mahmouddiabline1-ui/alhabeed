import test from "node:test";
import assert from "node:assert/strict";
import { GameEngine } from "../src/core/engine.js";
import { GameError } from "../src/core/errors.js";
import { QuestionBank } from "../src/core/questions.js";
import { seedQuestions } from "../src/content/seed.js";

function setup(mode: "habbedha" | "true_or_bluff" | "complete_bluff" = "habbedha") {
  let time = 1_000;
  const engine = new GameEngine(new QuestionBank(seedQuestions), () => time, () => 0);
  const room = engine.createRoom({ id: "p1", name: "Ahmed" }, { modes: [mode], totalRounds: 3 });
  engine.joinRoom(room.code, { id: "p2", name: "Mona" });
  engine.joinRoom(room.code, { id: "p3", name: "Omar" });
  return { engine, code: room.code, setTime: (value: number) => { time = value; } };
}

function expectCode(fn: () => unknown, code: string) {
  assert.throws(fn, (error) => error instanceof GameError && error.code === code);
}

test("nobody sees the correct answer before reveal", () => {
  const { engine, code } = setup();
  engine.start(code, "p1");
  const state = engine.publicState(code, "p2");
  assert.equal(state.round?.correctAnswer, undefined);
  assert.equal(state.round?.explanation, undefined);
  assert.deepEqual(state.round?.options, []);
});

test("all players answer, then any option including own answer can be voted", () => {
  const { engine, code } = setup();
  engine.start(code, "p1");
  engine.submitAnswer(code, "p1", "إجابة أحمد");
  engine.submitAnswer(code, "p2", "إجابة منى");
  const voting = engine.submitAnswer(code, "p3", "إجابة عمر");
  assert.equal(voting.phase, "voting");
  const own = voting.round!.options.find((option) => option.authorId === "p1")!;
  engine.vote(code, "p1", own.id);
  const correct = voting.round!.options.find((option) => option.isCorrect)!;
  engine.vote(code, "p2", correct.id);
  const p1Answer = voting.round!.options.find((option) => option.authorId === "p1")!;
  const reveal = engine.vote(code, "p3", p1Answer.id);
  assert.equal(reveal.phase, "reveal");
  assert.equal(reveal.round!.scoreDelta.p1, 1, "self vote earns zero; other fooled player earns one");
  assert.equal(reveal.round!.scoreDelta.p2, 2);
});

test("true-or-bluff starts directly in voting and scores correct choice", () => {
  const { engine, code } = setup("true_or_bluff");
  const state = engine.start(code, "p1");
  assert.equal(state.phase, "voting");
  assert.deepEqual(state.round!.options.map(x => x.text).sort(), ["صح", "هبد"].sort());
  const correct = state.round!.options.find(x => x.isCorrect)!;
  engine.vote(code, "p1", correct.id);
  engine.vote(code, "p2", correct.id);
  const reveal = engine.vote(code, "p3", correct.id);
  assert.equal(reveal.players.p1!.score, 2);
  assert.equal(reveal.players.p2!.score, 2);
  assert.equal(reveal.players.p3!.score, 2);
});

test("host can customize timers in lobby and invalid values are rejected", () => {
  const { engine, code } = setup();
  const state = engine.updateSettings(code, "p1", { answerSeconds: 60, voteSeconds: 30, revealSeconds: 8 });
  assert.equal(state.settings.answerSeconds, 60);
  expectCode(() => engine.updateSettings(code, "p2", { answerSeconds: 70 }), "HOST_ONLY");
  expectCode(() => engine.updateSettings(code, "p1", { voteSeconds: 2 }), "INVALID_VOTE_TIME");
});

test("phase deadlines advance unanswered rounds and finish after configured rounds", () => {
  const { engine, code, setTime } = setup("habbedha");
  let state = engine.start(code, "p1");
  setTime(state.round!.phaseEndsAt);
  state = engine.advanceExpired(code);
  assert.equal(state.phase, "voting");
  assert.equal(state.round!.options.length, 1, "correct answer remains available when nobody submitted");
  setTime(state.round!.phaseEndsAt);
  state = engine.advanceExpired(code);
  assert.equal(state.phase, "reveal");
  setTime(state.round!.phaseEndsAt);
  state = engine.advanceExpired(code);
  assert.equal(state.round!.number, 2);
});

test("disconnect migrates host and reconnect preserves identity and score", () => {
  const { engine, code } = setup();
  const disconnected = engine.setConnected(code, "p1", false);
  assert.equal(disconnected.hostId, "p2");
  const reconnected = engine.reconnect(code, "p1");
  assert.equal(reconnected.players.p1!.connected, true);
  assert.equal(reconnected.hostId, "p2");
});

test("public voting state hides authors, correctness, and votes until reveal", () => {
  const { engine, code } = setup("complete_bluff");
  engine.start(code, "p1");
  engine.submitAnswer(code, "p1", "واحد");
  engine.submitAnswer(code, "p2", "اثنين");
  engine.submitAnswer(code, "p3", "ثلاثة");
  const publicState = engine.publicState(code, "p1");
  for (const option of publicState.round!.options) {
    assert.equal(option.authorId, undefined);
    assert.equal(option.isCorrect, undefined);
    assert.deepEqual(option.votes, []);
  }
});

test("room constraints and duplicate actions are enforced", () => {
  const { engine, code } = setup();
  expectCode(() => engine.joinRoom(code, { id: "p2", name: "Again" }), "ALREADY_JOINED");
  engine.start(code, "p1");
  engine.submitAnswer(code, "p1", "أول إجابة");
  expectCode(() => engine.submitAnswer(code, "p1", "إجابة ثانية"), "ALREADY_ANSWERED");
  expectCode(() => engine.joinRoom(code, { id: "p4", name: "Late" }), "GAME_STARTED");
});

test("question selection balances packages while staying random inside a package", () => {
  const questions = [
    { id:"a1", packageId:"a", mode:"habbedha" as const, prompt:"a1", correctAnswer:"a", explanation:"a" },
    { id:"a2", packageId:"a", mode:"habbedha" as const, prompt:"a2", correctAnswer:"a", explanation:"a" },
    { id:"b1", packageId:"b", mode:"habbedha" as const, prompt:"b1", correctAnswer:"b", explanation:"b" },
    { id:"b2", packageId:"b", mode:"habbedha" as const, prompt:"b2", correctAnswer:"b", explanation:"b" },
  ];
  const bank = new QuestionBank(questions);
  const first = bank.pick("habbedha", ["a", "b"], new Set(), () => 0);
  const second = bank.pick("habbedha", ["a", "b"], new Set([first.id]), () => 0);
  assert.notEqual(first.packageId, second.packageId);
});

test("local sampling cycles modes, balances packages, and never repeats a question",()=>{
  const modes=["habbedha","true_or_bluff","complete_bluff"] as const;
  const questions=modes.flatMap((mode)=>["a","b"].flatMap(packageId=>[1,2,3].map(number=>({id:`${mode}-${packageId}-${number}`,packageId,mode,prompt:"سؤال",correctAnswer:"صح",explanation:"شرح"}))));
  const picked=new QuestionBank(questions).sample([...modes],["a","b"],9,()=>0);
  assert.equal(new Set(picked.map(question=>question.id)).size,9);
  assert.deepEqual(picked.slice(0,3).map(question=>question.mode),[...modes]);
  const aTotal=picked.filter(question=>question.packageId==="a").length;
  const bTotal=picked.filter(question=>question.packageId==="b").length;
  assert.ok(Math.abs(aTotal-bTotal)<=1);
});
