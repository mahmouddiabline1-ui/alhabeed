import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, Copy, Crown, LogIn, Play, RotateCcw, Send, Settings2, Sparkles, UserRound, Users } from "lucide-react";
import { io } from "socket.io-client";
import type { ModeId, Player, Room, Session } from "./types";
import { LocalGame } from "./LocalGame";
import { CategoryLibrary, DEFAULT_CATEGORY_IDS } from "./CategoryLibrary";
import { CATEGORIES, type CategoryId } from "./catalog";
import { serverUrl } from "./serverUrl";
import { createProfile, currentAccessToken, logoutAll, restoreProfile, updateProfile, type CharacterId, type Profile } from "./identityClient";
import { ProfilePanel } from "./ProfilePanel";
import type { AppScreen } from "./BottomNav";
import { PortalPage } from "./PortalPage";
import { AppShell } from "./platform/AppShell";
import { AppRoutes } from "./platform/routes";
import { roomInviteUrl } from "./platform/inviteUrl";

const socket = io(serverUrl || undefined, { autoConnect: false });
const MODE_NAMES: Record<ModeId,string> = { habbedha: "هَبِّدها", true_or_bluff: "صح ولا هبد؟", complete_bluff: "كمّل الهبدة" };
const DEFAULTS = { totalRounds: 9, answerSeconds: 45, voteSeconds: 25, revealSeconds: 10, packageIds: DEFAULT_CATEGORY_IDS };
const roomCodeFromLocation = (pathname: string, search: string) => {
  const routeCode = pathname.match(/^\/room\/([A-Z0-9]{6})$/u)?.[1];
  return routeCode ?? new URLSearchParams(search).get("room") ?? "";
};

export function App() {
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const legacyRoomRef = useRef(new URLSearchParams(window.location.search).get("room") ?? "");
  const [room, setRoom] = useState<Room | null>(null);
  const [session, setSession] = useState<Session | null>(() => readSession());
  const [name, setName] = useState(session?.name ?? "");
  const [code, setCode] = useState(() => roomCodeFromLocation(routerLocation.pathname, routerLocation.search));
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [availableCategories, setAvailableCategories] = useState<CategoryId[]>(DEFAULT_CATEGORY_IDS);
  const [now, setNow] = useState(Date.now());
  const [settings, setSettings] = useState({ ...DEFAULTS, modes: ["habbedha","true_or_bluff","complete_bluff"] as ModeId[] });
  const [profile,setProfile]=useState<Profile|null>(null);
  const [profileOpen,setProfileOpen]=useState(false);
  const [profileBusy,setProfileBusy]=useState(false);
  const [profileError,setProfileError]=useState("");

  useEffect(() => {
    let active=true;
    const requestedRoom = roomCodeFromLocation(routerLocation.pathname, routerLocation.search) || legacyRoomRef.current;
    const onState = (state: Room) => { setRoom(state); setError(""); };
    const onError = (e: {message:string}) => setError(arabicError(e.message));
    socket.on("room:state", onState); socket.on("game:error", onError);
    void restoreProfile().then(value=>{
      if(!active)return;
      setProfile(value);if(value)setName(current=>current||value.displayName);
      socket.auth={accessToken:currentAccessToken()};socket.connect();
      if (session?.token && requestedRoom === session.code) socket.emit("room:reconnect", {code:session.code,token:session.token}, (state: Room) => {
          setRoom(state);
          setSettings({...state.settings,packageIds:state.settings.packageIds.filter((id):id is CategoryId=>id in CATEGORIES)});
        });
    });
    const clock = setInterval(() => setNow(Date.now()), 250);
    return () => { active=false;socket.off("room:state", onState); socket.off("game:error", onError); socket.disconnect(); clearInterval(clock); };
  }, []);

  useEffect(() => {
    const known = new Set(Object.keys(CATEGORIES));
    fetch(`${serverUrl.replace(/\/$/u, "")}/api/content/catalog`)
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data: {categories?: Array<{id:string}>}) => {
        const published = (data.categories ?? []).map(({id}) => id).filter((id): id is CategoryId => known.has(id));
        if (!published.length) throw new Error();
        setAvailableCategories(published);
        setSettings((current) => ({...current, packageIds: published}));
      })
      .catch(() => setError("السيرفر مش متصل بمكتبة الفئات دلوقتي — متاحين الفئات الأساسية"));
  }, []);

  useEffect(() => { setAnswer(""); }, [room?.round?.number, room?.round?.phase]);
  useEffect(() => {
    const requestedRoom = roomCodeFromLocation(routerLocation.pathname, routerLocation.search);
    if (requestedRoom) setCode(requestedRoom);
  }, [routerLocation.pathname, routerLocation.search]);
  const setScreen = (next:AppScreen) => {
    const routes:Record<AppScreen,string> = { home:"/", create:"/games/alhabeed/create", join:"/games/alhabeed/join", local:"/games/alhabeed/local", news:"/news", notifications:"/notifications" };
    navigate(routes[next]);
  };

  const me = session && room ? room.players[session.playerId] : null;
  const isHost = Boolean(me && room?.hostId === me.id);
  const remaining = room?.round ? Math.max(0, Math.ceil((room.round.phaseEndsAt - now) / 1000)) : 0;

  const create = (e: FormEvent) => {
    e.preventDefault();
    if (!settings.packageIds.length) { setError("اختار فئة واحدة على الأقل"); return; }
    setError("");
    socket.emit("room:create", { name, settings }, (result: {player:{id:string},room:Room}) => saveAndEnter(result, name, setSession, setRoom, navigate));
  };
  const join = (e: FormEvent) => {
    e.preventDefault(); setError("");
    socket.emit("room:join", { name, code: code.trim().toUpperCase() }, (result: {player:{id:string},room:Room}) => saveAndEnter(result, name, setSession, setRoom, navigate));
  };
  const emit = (event: string, payload: object, expectedVersion = room?.version) => new Promise<Room>((resolve) => {
    socket.emit(event, { ...payload, commandId: crypto.randomUUID(), expectedVersion }, (state:Room) => {
      setRoom(state);
      resolve(state);
    });
  });

  const refreshSocketIdentity=()=>{socket.auth={accessToken:currentAccessToken()};if(!room){socket.disconnect();socket.connect();}};
  const saveProfile=async(displayName:string,character:CharacterId)=>{setProfileBusy(true);setProfileError("");try{const value=profile?await updateProfile(displayName,character):await createProfile(displayName,character);setProfile(value);setName(value.displayName);refreshSocketIdentity();setProfileOpen(false);}catch(reason){setProfileError(reason instanceof Error?arabicIdentityError(reason.message):"حصلت مشكلة في حفظ البروفايل");}finally{setProfileBusy(false);}};
  const signOut=async()=>{setProfileBusy(true);setProfileError("");try{await logoutAll();setProfile(null);refreshSocketIdentity();setProfileOpen(false);}catch(reason){setProfileError(reason instanceof Error?arabicIdentityError(reason.message):"تعذّر تسجيل الخروج");}finally{setProfileBusy(false);}};
  const profilePanel=<ProfilePanel open={profileOpen} profile={profile} busy={profileBusy} error={profileError} onClose={()=>{setProfileOpen(false);setProfileError("");}} onSave={saveProfile} onLogout={signOut}/>;
  const shell = (children:React.ReactNode) => <AppShell profilePanel={profilePanel} onProfile={()=>setProfileOpen(true)}>{children}</AppShell>;
  const home = <Home screen="home" setScreen={setScreen} name={name} setName={setName} code={code} setCode={setCode} create={create} join={join} settings={settings} setSettings={setSettings} availableCategories={availableCategories} error={error} profile={profile} openProfile={()=>setProfileOpen(true)} />;
  const roomView = !room || !session || !me ? shell(home) : <main className="app-shell">
    <TopBar room={room} me={me} remaining={remaining} />
    {error && <div className="toast">{error}</div>}
    {room.phase === "lobby" && <Lobby room={room} session={session} isHost={isHost} settings={settings} setSettings={setSettings} availableCategories={availableCategories} emit={emit} />}
    {room.phase === "answering" && room.round && <AnswerPhase room={room} session={session} answer={answer} setAnswer={setAnswer} emit={emit} />}
    {room.phase === "voting" && room.round && <VotePhase room={room} session={session} emit={emit} />}
    {room.phase === "reveal" && room.round && <Reveal room={room} session={session} />}
    {room.phase === "finished" && <Finished room={room} session={session} />}
    {profilePanel}
  </main>;
  return <AppRoutes elements={{
    hub: shell(home),
    localAlHabeed: shell(<LocalGame onExit={()=>setScreen("home")} />),
    createAlHabeed: shell(<Home screen="create" setScreen={setScreen} name={name} setName={setName} code={code} setCode={setCode} create={create} join={join} settings={settings} setSettings={setSettings} availableCategories={availableCategories} error={error} profile={profile} openProfile={()=>setProfileOpen(true)} />),
    joinAlHabeed: shell(<Home screen="join" setScreen={setScreen} name={name} setName={setName} code={code} setCode={setCode} create={create} join={join} settings={settings} setSettings={setSettings} availableCategories={availableCategories} error={error} profile={profile} openProfile={()=>setProfileOpen(true)} />),
    roomAlHabeed: (routeCode) => !room || !session || !me || room.code !== routeCode
      ? shell(<Home screen="join" setScreen={setScreen} name={name} setName={setName} code={code || routeCode} setCode={setCode} create={create} join={join} settings={settings} setSettings={setSettings} availableCategories={availableCategories} error={error} profile={profile} openProfile={()=>setProfileOpen(true)} />)
      : roomView,
    news: shell(<PortalPage kind="news" />),
    notifications: shell(<PortalPage kind="notifications" />),
  }} />;
}

function Home(p: any) {
  return <main className="home">
    <button type="button" className="profile-entry" onClick={p.openProfile} aria-label={p.profile?"فتح البروفايل":"إنشاء بروفايل"}><span className={p.profile?"profile-entry-avatar has-character":"profile-entry-avatar"} style={p.profile?characterStyle(p.profile.selectedCharacterId):undefined}>{!p.profile&&<UserRound/>}</span><span><b>{p.profile?.displayName??"البروفايل"}</b><small>{p.profile?"تعديل الاسم والشخصية":"احفظ اسمك وشخصيتك"}</small></span></button>
    <div className="confetti c1"/><div className="confetti c2"/><div className="confetti c3"/>
    <section className="brand-card">
      <h1 className="sr-only">الهَبِّيد</h1>
      <img className="brand-lockup" src={`${import.meta.env.BASE_URL}logo-concept.png?v=2`} alt="الهَبِّيد" />
      <p className="slogan">لو مش عارفها… <strong>لازم تهبدها</strong></p>
    </section>
    {p.error && <div className="toast static">{p.error}</div>}
    {p.screen === "home" ? <section className="actions">
      <button className="primary" onClick={() => p.setScreen("create")}><Sparkles/> اعمل قعدة</button>
      <button className="local-button" onClick={() => p.setScreen("local")}><Play/> جرّب لوكال</button>
      <button className="secondary" onClick={() => p.setScreen("join")}><LogIn/> ادخل بكود</button>
      <p className="tiny">٣–١٠ لاعبين · من أي موبايل</p>
    </section> : <form className="panel form" onSubmit={p.screen === "create" ? p.create : p.join}>
      <button type="button" className="back" onClick={() => p.setScreen("home")}>→ رجوع</button>
      <h2>{p.screen === "create" ? "اعمل قعدة جديدة" : "خش على صحابك"}</h2>
      <label>اسمك<input value={p.name} onChange={(e:any)=>p.setName(e.target.value)} placeholder="اكتب اسمك" minLength={2} maxLength={24} required /></label>
      {p.screen === "join" && <label>كود القعدة<input className="code-input" value={p.code} onChange={(e:any)=>p.setCode(e.target.value)} placeholder="A1B2C3" maxLength={6} required /></label>}
      {p.screen === "create" && <><QuickSettings settings={p.settings} setSettings={p.setSettings} /><CategoryPicker settings={p.settings} setSettings={p.setSettings} available={p.availableCategories}/></>}
      <button className="primary" type="submit" disabled={p.screen === "create" && (!p.settings.modes.length || !p.settings.packageIds.length)}><Play/> {p.screen === "create" ? "أنشئ القعدة" : "ادخل القعدة"}</button>
    </form>}
  </main>;
}

function QuickSettings({settings,setSettings}:{settings:any,setSettings:(s:any)=>void}) {
  const toggle = (mode:ModeId) => setSettings({...settings,modes: settings.modes.includes(mode) ? settings.modes.filter((m:ModeId)=>m!==mode) : [...settings.modes,mode]});
  return <div className="quick-settings"><span><Settings2/> المودات</span><div className="chips">
    {(Object.keys(MODE_NAMES) as ModeId[]).map(m=><button type="button" key={m} className={settings.modes.includes(m)?"chip active":"chip"} onClick={()=>toggle(m)}>{MODE_NAMES[m]}</button>)}
  </div></div>;
}

function CategoryPicker({settings,setSettings,available}:{settings:any;setSettings:(s:any)=>void;available:CategoryId[]}) {
  const toggle = (category:CategoryId) => setSettings({...settings, packageIds: settings.packageIds.includes(category) ? settings.packageIds.filter((id:CategoryId) => id !== category) : [...settings.packageIds, category]});
  return <div className="online-category-picker">
    <div className="online-category-heading"><b>فئات القعدة</b><span>{settings.packageIds.length} مختارة</span></div>
    <CategoryLibrary compact selected={settings.packageIds} available={available} onToggle={toggle}/>
    {!settings.packageIds.length && <small className="selection-warning">اختار فئة واحدة على الأقل عشان تبدأ</small>}
  </div>;
}

function TopBar({room,me,remaining}:{room:Room,me:any,remaining:number}) {
  return <header><div className="mini-brand">الهَبِّيد</div><div className="room-pill"><Users size={16}/> {Object.keys(room.players).length} · {room.code}</div>{room.round && <div className="timer">{remaining}</div>}<div className="score">{me.score} نقطة</div></header>;
}

function Lobby({room,session,isHost,settings,setSettings,availableCategories,emit}:any) {
  const copyInvite = () => navigator.clipboard.writeText(roomInviteUrl(room.code));
  const update = () => emit("room:settings", {code:room.code,patch:settings});
  const start = async () => {
    const updated = await update();
    await emit("game:start",{code:room.code},updated.version);
  };
  return <section className="stage lobby"><div className="eyebrow">القعدة جاهزة</div><h2>لمّ صحابك وابدأوا الهبد</h2>
    <button className="invite" onClick={copyInvite}><Copy/> كود القعدة <b>{room.code}</b></button>
    <div className="players">{Object.values(room.players).map((p:any)=><div className={p.connected?"player":"player offline"} key={p.id}><div className="avatar">{p.name[0]}</div><span>{p.name}</span>{room.hostId===p.id&&<Crown size={18}/>}<i>{p.connected?"جاهز":"فاصل"}</i></div>)}</div>
    {isHost ? <div className="host-controls"><h3>إعدادات القعدة</h3><QuickSettings settings={settings} setSettings={setSettings}/><CategoryPicker settings={settings} setSettings={setSettings} available={availableCategories}/><div className="settings-grid">
      <NumberField label="الجولات" value={settings.totalRounds} min={3} max={30} onChange={(v)=>setSettings({...settings,totalRounds:v})}/>
      <NumberField label="وقت الإجابة" value={settings.answerSeconds} min={15} max={180} onChange={(v)=>setSettings({...settings,answerSeconds:v})}/>
      <NumberField label="وقت التصويت" value={settings.voteSeconds} min={10} max={90} onChange={(v)=>setSettings({...settings,voteSeconds:v})}/>
    </div><button className="secondary small" disabled={!settings.packageIds.length} onClick={update}>حفظ الإعدادات</button><button className="primary" disabled={Object.keys(room.players).length<3||settings.modes.length===0||settings.packageIds.length===0} onClick={start}><Play/> ابدأ اللعب</button></div> : <div className="waiting"><span className="loader"/> مستنيين صاحب القعدة يبدأ…</div>}
  </section>;
}

function NumberField({label,value,min,max,onChange}:{label:string,value:number,min:number,max:number,onChange:(v:number)=>void}) { return <label className="number-field">{label}<div><button type="button" onClick={()=>onChange(Math.max(min,value-5))}>−</button><b>{value}</b><button type="button" onClick={()=>onChange(Math.min(max,value+5))}>+</button></div></label> }

function AnswerPhase({room,session,answer,setAnswer,emit}:any) {
  const r=room.round; const sent=r.hasSubmitted;
  if(r.mode==="true_or_bluff") return null;
  return <section className="stage round"><div className="round-meta">جولة {r.number} من {room.settings.totalRounds} · {MODE_NAMES[r.mode as ModeId]}</div><h2>{r.prompt}</h2>
    {sent ? <div className="submitted"><Check/> هبدتك وصلت<br/><small>محدش هيعرف إنها بتاعتك قبل الكشف</small></div> : <form onSubmit={(e)=>{e.preventDefault();emit("round:answer",{code:room.code,text:answer})}}><textarea autoFocus value={answer} onChange={e=>setAnswer(e.target.value)} placeholder={r.mode==="complete_bluff"?"كمّل الجملة بإجابة مقنعة…":"اكتب إجابة غلط بس تتصدق…"} maxLength={160}/><div className="char-count">{answer.length}/160</div><button className="primary" disabled={!answer.trim()}><Send/> ابعت الهبدة</button></form>}
  </section>;
}

function VotePhase({room,session,emit}:any) {
  const r=room.round;
  return <section className="stage round"><div className="round-meta">جولة {r.number} · وقت التصويت</div><h2>{r.prompt}</h2><p>اختار الإجابة الصح — مسموح تختار أي إجابة.</p>
    {r.hasVoted?<div className="submitted"><Check/> صوتك اتحسب</div>:<div className="options">{r.options.map((o:any,i:number)=><button key={o.id} onClick={()=>emit("round:vote",{code:room.code,optionId:o.id})}><span>{arabicNumber(i+1)}</span>{o.text}</button>)}</div>}
  </section>;
}

function Reveal({room,session}:any) {
  const r=room.round; const players=room.players;
  return <section className="stage round reveal"><div className="round-meta">اتكشفت الهبدة</div><h2>{r.prompt}</h2><div className="options">{r.options.map((o:any)=><div className={o.isCorrect?"result correct":"result"} key={o.id}><div>{o.isCorrect&&<Check/>}<b>{o.text}</b></div><small>{o.isCorrect?"الإجابة الصحيحة":o.authorId?`هبدة ${players[o.authorId]?.name}`:""} · {o.votes.length} أصوات</small></div>)}</div>
    <p className="explanation">{r.explanation}</p><div className="delta">{(r.scoreDelta[session.playerId]??0)>0?`+${r.scoreDelta[session.playerId]} نقطة ليك`:`الجولة دي عدّت عليك`}</div>
  </section>;
}

function Finished({room,session}:any) {
  const ranking=useMemo(()=>Object.values(room.players as Record<string,Player>).sort((a,b)=>b.score-a.score),[room.version]);
  return <section className="stage finished"><Sparkles className="trophy"/><div className="eyebrow">القعدة خلصت</div><h2>{ranking[0]?.name} كسبها!</h2><div className="ranking">{ranking.map((p,i)=><div className={p.id===session.playerId?"rank me":"rank"} key={p.id}><b>{i+1}</b><span>{p.name}</span><strong>{p.score}</strong></div>)}</div><button className="secondary" onClick={()=>location.reload()}><RotateCcw/> قعدة جديدة</button></section>;
}

function saveAndEnter(result:any,name:string,setSession:any,setRoom:any,navigate:(to:string)=>void){const s={code:result.room.code,playerId:result.player.id,name,token:result.reconnectToken};localStorage.setItem("alhabeed:session",JSON.stringify(s));setSession(s);setRoom(result.room);navigate(`/room/${s.code}`)}
function readSession():Session|null{try{return JSON.parse(localStorage.getItem("alhabeed:session")||"null")}catch{return null}}
function arabicNumber(n:number){return String(n).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[Number(d)])}
function arabicError(message:string){const map:Record<string,string>={"Room not found":"القعدة دي مش موجودة","At least 3 players are required":"لازم ٣ لاعبين على الأقل","Room is full":"القعدة كملت","Player already joined":"أنت موجود بالفعل"};return map[message]??message}
function characterStyle(id:CharacterId){const index=Number(id.split("-")[1])-1;return {backgroundPosition:`${(index%4)*33.333}% ${Math.floor(index/4)*50}%`};}
function arabicIdentityError(message:string){if(message==="NO_ACCESS_TOKEN")return "الجلسة انتهت — افتح البروفايل وسجّل من جديد";if(message.includes("validation"))return "راجع الاسم والشخصية وحاول تاني";if(message.includes("fetch")||message.includes("الاتصال"))return "السيرفر مش متاح دلوقتي، حاول كمان شوية";return message;}
