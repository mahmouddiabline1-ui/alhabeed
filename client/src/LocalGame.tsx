import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, Check, Home, Send, Sparkles } from "lucide-react";
import type { ModeId } from "./types";
import {
  CATEGORIES,
  LOCAL_QUESTIONS,
  type CategoryId,
  type LocalQuestion,
} from "./localQuestions";

type Phase = "setup" | "answer" | "vote" | "reveal" | "done";
interface Option {
  id: number;
  text: string;
  owner: "correct" | "you" | "felfel" | "soso";
  votes: string[];
}
const MODE_NAMES: Record<ModeId, string> = {
  habbedha: "هَبِّدها",
  true_or_bluff: "صح ولا هبد؟",
  complete_bluff: "كمّل الهبدة",
};
const ALL_MODES = Object.keys(MODE_NAMES) as ModeId[],
  ALL_CATS = Object.keys(CATEGORIES) as CategoryId[];

export function LocalGame({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>("setup"),
    [round, setRound] = useState(0),
    [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [modes, setModes] = useState<ModeId[]>(ALL_MODES),
    [cats, setCats] = useState<CategoryId[]>(ALL_CATS),
    [roundCount, setRoundCount] = useState(9);
  const [answer, setAnswer] = useState(""),
    [options, setOptions] = useState<Option[]>([]),
    [scores, setScores] = useState({ you: 0, felfel: 0, soso: 0 });
  const q = questions[round];
  const toggle = <T,>(x: T, list: T[], set: (v: T[]) => void) =>
    set(list.includes(x) ? list.filter((v) => v !== x) : [...list, x]);
  const start = () => {
    const pool = LOCAL_QUESTIONS.filter(
      (q) => modes.includes(q.mode) && cats.includes(q.category),
    ).sort(() => Math.random() - 0.5);
    const picked = pool.slice(0, Math.min(roundCount, pool.length));
    setQuestions(picked);
    setRound(0);
    setScores({ you: 0, felfel: 0, soso: 0 });
    if (picked[0]?.mode === "true_or_bluff") {
      setOptions(binary(picked[0]));
      setPhase("vote");
    } else setPhase("answer");
  };
  const openVote = (submitted: string) => {
    const raw: Option[] = [
      { id: 1, text: q.correct, owner: "correct", votes: [] },
      { id: 2, text: submitted, owner: "you", votes: [] },
      { id: 3, text: q.decoys[0], owner: "felfel", votes: [] },
      { id: 4, text: q.decoys[1], owner: "soso", votes: [] },
    ];
    setOptions(
      raw.sort(() => Math.random() - 0.5).map((o, i) => ({ ...o, id: i + 1 })),
    );
    setPhase("vote");
  };
  const vote = (id: number) => {
    const chosen = options.find((o) => o.id === id)!;
    const f = options[Math.floor(Math.random() * options.length)],
      s = options[Math.floor(Math.random() * options.length)];
    const updated = options.map((o) => ({
      ...o,
      votes: [
        ...(o.id === id ? ["أنت"] : []),
        ...(o.id === f.id ? ["فلفل"] : []),
        ...(o.id === s.id ? ["سوسو"] : []),
      ],
    }));
    const d = {
      you: chosen.owner === "correct" ? 2 : 0,
      felfel: f.owner === "correct" ? 2 : 0,
      soso: s.owner === "correct" ? 2 : 0,
    };
    for (const o of updated) {
      if (o.owner === "you") d.you += o.votes.filter((v) => v !== "أنت").length;
      if (o.owner === "felfel")
        d.felfel += o.votes.filter((v) => v !== "فلفل").length;
      if (o.owner === "soso")
        d.soso += o.votes.filter((v) => v !== "سوسو").length;
    }
    setOptions(updated);
    setScores((x) => ({
      you: x.you + d.you,
      felfel: x.felfel + d.felfel,
      soso: x.soso + d.soso,
    }));
    setPhase("reveal");
  };
  const next = () => {
    if (round === questions.length - 1) {
      setPhase("done");
      return;
    }
    const n = round + 1;
    setRound(n);
    setAnswer("");
    const nq = questions[n];
    if (nq.mode === "true_or_bluff") {
      setOptions(binary(nq));
      setPhase("vote");
    } else {
      setOptions([]);
      setPhase("answer");
    }
  };
  const ranking = useMemo(
    () =>
      [
        { name: "أنت", score: scores.you },
        { name: "فلفل", score: scores.felfel },
        { name: "سوسو", score: scores.soso },
      ].sort((a, b) => b.score - a.score),
    [scores],
  );
  if (phase === "setup")
    return (
      <main className="local-shell setup">
        <header>
          <button
            className="icon-button back-with-label"
            onClick={onExit}
            aria-label="الرجوع للرئيسية"
          >
            <ArrowRight />
            <span>رجوع</span>
          </button>
          <div className="mini-brand">العب مع الهَبِّيد</div>
          <span />
        </header>
        <section className="local-setup">
          <div className="eyebrow">مكتبة القعدة</div>
          <h1>اختار باكدجات الهبد</h1>
          <p className="setup-intro">
            اختار فئة أو أكتر، وكل قعدة هتطلعلك أسئلة مختلفة من بنك الأسئلة.
          </p>
          <div className="category-grid">
            {ALL_CATS.map((c) => (
              <button
                key={c}
                className={
                  cats.includes(c) ? "category-card active" : "category-card"
                }
                onClick={() => toggle(c, cats, setCats)}
              >
                <i style={{ backgroundPosition: CATEGORIES[c].position }} />
                <em>{cats.includes(c) ? "✓ متضاف" : "+ ضيف"}</em>
                <b>{CATEGORIES[c].name}</b>
                <span>
                  {LOCAL_QUESTIONS.filter((q) => q.category === c).length} سؤال
                </span>
              </button>
            ))}
          </div>
          <div className="setup-section">
            <h3>طريقة اللعب</h3>
            <div className="chips local-chips">
            {ALL_MODES.map((m) => (
              <button
                key={m}
                className={modes.includes(m) ? "chip active" : "chip"}
                onClick={() => toggle(m, modes, setModes)}
              >
                {MODE_NAMES[m]}
              </button>
            ))}
            </div>
            <div className="round-picker">
            <span>عدد الجولات</span>
            {[6, 9, 12].map((n) => (
              <button
                className={roundCount === n ? "active" : ""}
                onClick={() => setRoundCount(n)}
                key={n}
              >
                {n}
              </button>
            ))}
            </div>
          </div>
          <div className="local-start-bar">
            <div><b>{cats.length} فئات</b><span>{modes.length} مودات · {roundCount} جولات</span></div>
            <button
              className="primary"
              disabled={!modes.length || !cats.length}
              onClick={start}
            >
              <Sparkles /> ابدأ اللعبة
            </button>
          </div>
        </section>
      </main>
    );
  if (phase === "done")
    return (
      <main className="local-shell">
        <section className="stage finished">
          <Sparkles className="trophy" />
          <div className="eyebrow">القعدة خلصت</div>
          <h2>{ranking[0].name} في المركز الأول</h2>
          <div className="ranking">
            {ranking.map((p, i) => (
              <div
                className={p.name === "أنت" ? "rank me" : "rank"}
                key={p.name}
              >
                <b>{i + 1}</b>
                <span>{p.name}</span>
                <strong>{p.score}</strong>
              </div>
            ))}
          </div>
          <button className="primary" onClick={() => setPhase("setup")}>
            <Sparkles /> العب تاني
          </button>
          <button className="secondary" onClick={onExit}>
            <Home /> الرئيسية
          </button>
        </section>
      </main>
    );
  return (
    <main className="local-shell">
      <header>
        <button className="icon-button" onClick={() => setPhase("setup")} aria-label="الرجوع لاختيار الفئات">
          <ArrowRight />
        </button>
        <div className="mini-brand">{CATEGORIES[q.category].name}</div>
        <div className="score">أنت {scores.you}</div>
      </header>
      <div className="progress">
        <i style={{ width: `${((round + 1) / questions.length) * 100}%` }} />
      </div>
      <section className="stage round">
        <div
          className="question-art"
          style={{ backgroundPosition: CATEGORIES[q.category].position }}
        />
        <div className="round-meta">
          جولة {round + 1} من {questions.length} · {MODE_NAMES[q.mode]}
        </div>
        <h2>{q.prompt}</h2>
        {phase === "answer" && (
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (answer.trim()) openVote(answer.trim());
            }}
          >
            <textarea
              autoFocus
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              maxLength={160}
              placeholder={
                q.mode === "complete_bluff"
                  ? "كمّلها بهبدة تتصدق…"
                  : "اكتب إجابة مقنعة…"
              }
            />
            <button className="primary" disabled={!answer.trim()}>
              <Send /> ابعت الهبدة
            </button>
          </form>
        )}
        {phase === "vote" && (
          <>
            <p>فلفل وسوسو هبدوا كمان… اختار الإجابة الصح.</p>
            <div className="options">
              {options.map((o, i) => (
                <button key={o.id} onClick={() => vote(o.id)}>
                  <span>{i + 1}</span>
                  {o.text}
                </button>
              ))}
            </div>
          </>
        )}
        {phase === "reveal" && (
          <>
            <div className="options">
              {options.map((o) => (
                <div
                  className={
                    o.owner === "correct" ? "result correct" : "result"
                  }
                  key={o.id}
                >
                  <div>
                    {o.owner === "correct" && <Check />}
                    <b>{o.text}</b>
                  </div>
                  <small>
                    {o.owner === "correct"
                      ? "الإجابة الصحيحة"
                      : o.owner === "you"
                        ? "هبدتك"
                        : o.owner === "felfel"
                          ? "هبدة فلفل"
                          : "هبدة سوسو"}{" "}
                    · {o.votes.join("، ") || "محدش اختارها"}
                  </small>
                </div>
              ))}
            </div>
            <p className="explanation">{q.explanation}</p>
            <button className="primary" onClick={next}>
              {round === questions.length - 1
                ? "شوف النتيجة"
                : "الجولة اللي بعدها"}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
function binary(q: LocalQuestion): Option[] {
  return [
    {
      id: 1,
      text: "صح",
      owner: q.correct === "صح" ? "correct" : "felfel",
      votes: [],
    },
    {
      id: 2,
      text: "هبد",
      owner: q.correct === "هبد" ? "correct" : "soso",
      votes: [],
    },
  ];
}
