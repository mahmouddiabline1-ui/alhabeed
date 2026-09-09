import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Home, Send, Sparkles } from "lucide-react";
import type { ModeId } from "./types";
import {
  CATEGORIES,
  type CategoryId,
  type LocalQuestion,
} from "./catalog";
import { CategoryArtwork } from "./CategoryArtwork";
import { serverUrl } from "./serverUrl";

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
const LOCAL_SAVE_KEY = "alhabeed:local-game:v2";
const API_BASE=serverUrl.replace(/\/$/u,"");
interface LocalSave {
  phase: Phase; round: number; questions: LocalQuestion[]; modes: ModeId[];
  cats: CategoryId[]; roundCount: number; answer: string; options: Option[];
  scores: { you:number; felfel:number; soso:number };
}

export function LocalGame({ onExit }: { onExit: () => void }) {
  const [saved] = useState<LocalSave | null>(readLocalSave);
  const requestedSetup = location.hash === "#/local" || location.hash === "#/local/setup";
  const [phase, setPhase] = useState<Phase>(requestedSetup ? "setup" : saved?.phase ?? "setup"),
    [round, setRound] = useState(saved?.round ?? 0),
    [questions, setQuestions] = useState<LocalQuestion[]>(saved?.questions ?? []);
  const [modes, setModes] = useState<ModeId[]>(saved?.modes ?? ALL_MODES),
    [cats, setCats] = useState<CategoryId[]>(saved?.cats ?? ALL_CATS),
    [roundCount, setRoundCount] = useState(saved?.roundCount ?? 9);
  const [character, setCharacter] = useState(0);
  const [answer, setAnswer] = useState(saved?.answer ?? ""),
    [options, setOptions] = useState<Option[]>(saved?.options ?? []),
    [scores, setScores] = useState(saved?.scores ?? { you: 0, felfel: 0, soso: 0 });
  const [categoryCounts,setCategoryCounts]=useState<Record<string,number>>({});
  const [loading,setLoading]=useState(false);
  const [loadError,setLoadError]=useState("");
  const q = questions[round];
  const artStyle = (category: CategoryId) => ({
    backgroundImage: `url(${import.meta.env.BASE_URL}${CATEGORIES[category].art ?? "category-art-v1.png"})`,
    backgroundPosition: CATEGORIES[category].position,
    backgroundSize: CATEGORIES[category].size ?? "300% 200%",
  });
  const questionArt = (question: LocalQuestion) =>
    question.image
      ? {
          backgroundImage: `url(${import.meta.env.BASE_URL}${question.image.src})`,
          backgroundPosition: question.image.position,
          backgroundSize: question.image.size ?? "300% 200%",
        }
      : artStyle(question.category);
  const toggle = <T,>(x: T, list: T[], set: (v: T[]) => void) =>
    set(list.includes(x) ? list.filter((v) => v !== x) : [...list, x]);
  useEffect(() => {
    const safePhase = phase !== "setup" && !q ? "setup" : phase;
    localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify({phase:safePhase,round,questions,modes,cats,roundCount,answer,options,scores} satisfies LocalSave));
    const route = safePhase === "setup" ? "#/local/setup" : `#/local/play/${safePhase}/${round + 1}`;
    history.replaceState({screen:"local",phase:safePhase}, "", route);
  }, [phase,round,questions,modes,cats,roundCount,answer,options,scores,q]);
  useEffect(()=>{
    fetch(`${API_BASE}/api/content/catalog`).then(response=>{
      if(!response.ok)throw new Error("تعذّر تحميل مكتبة الأسئلة");return response.json();
    }).then((data:{categories:Array<{id:string;count:number}>})=>setCategoryCounts(Object.fromEntries(data.categories.map(category=>[category.id,category.count])))).catch(()=>setLoadError("السيرفر مش متصل ببنك الأسئلة دلوقتي"));
  },[]);
  const start = async () => {
    setLoading(true);setLoadError("");
    try {
      const response=await fetch(`${API_BASE}/api/local/questions`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({modes,categoryIds:cats,count:roundCount})});
      if(!response.ok)throw new Error("مش لاقيين أسئلة كفاية للاختيارات دي");
      const data=await response.json() as {questions:LocalQuestion[]};
      const picked=data.questions;
    setQuestions(picked);
    setRound(0);
    setScores({ you: 0, felfel: 0, soso: 0 });
    if (picked[0]?.mode === "true_or_bluff") {
      setOptions(binary(picked[0]));
      setPhase("vote");
      } else setPhase("answer");
    } catch(error) {setLoadError(error instanceof Error?error.message:"حصلت مشكلة في تحميل الأسئلة");}
    finally {setLoading(false);}
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
          {loadError&&<div className="toast static">{loadError}</div>}
          <div className="character-picker" aria-label="اختار شخصيتك">
            <div className="character-picker-heading"><b>اختار شخصيتك</b><span>دي هويتك في القعدة</span></div>
            <div className="character-grid">
              {Array.from({length:12},(_,i)=><button key={i} type="button" className={character===i?"character-choice active":"character-choice"} aria-label={`شخصية ${i+1}`} aria-pressed={character===i} onClick={()=>setCharacter(i)} style={{backgroundPosition:`${(i%4)*33.333}% ${Math.floor(i/4)*50}%`}} />)}
            </div>
          </div>
          <div className="category-grid">
            {ALL_CATS.map((c) => (
              <button
                key={c}
                className={
                  cats.includes(c) ? "category-card active" : "category-card"
                }
                onClick={() => toggle(c, cats, setCats)}
                aria-pressed={cats.includes(c)}
              >
                <CategoryArtwork category={c} />
                <em>{cats.includes(c) ? "✓ متضاف" : "+ ضيف"}</em>
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
                  aria-pressed={modes.includes(m)}
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
                  aria-pressed={roundCount === n}
                  key={n}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="local-start-bar">
            <div>
              <b>{cats.length} فئات</b>
              <span>
                {modes.length} مودات · {roundCount} جولات
              </span>
            </div>
            <button
              className="primary"
              disabled={!modes.length || !cats.length || loading}
              onClick={start}
            >
              <Sparkles /> {loading?"بنختار أسئلة القعدة…":"ابدأ اللعبة"}
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
        <button
          className="icon-button"
          onClick={() => setPhase("setup")}
          aria-label="الرجوع لاختيار الفئات"
        >
          <ArrowRight />
        </button>
        <div className="mini-brand">{CATEGORIES[q.category].name}</div>
        <div className="score">أنت {scores.you}</div>
      </header>
      <div className="progress">
        <i style={{ width: `${((round + 1) / questions.length) * 100}%` }} />
      </div>
      <section
        className="stage round"
        key={`${round}-${phase}`}
        data-phase={phase}
      >
        <div className="question-art" style={questionArt(q)} />
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
              aria-label="هبدتك"
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
function readLocalSave():LocalSave|null {
  try {
    const value = JSON.parse(localStorage.getItem(LOCAL_SAVE_KEY) || "null") as LocalSave|null;
    if (!value || !Array.isArray(value.questions) || !Array.isArray(value.cats) || !Array.isArray(value.modes)) return null;
    return value;
  } catch { return null; }
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
