import { FormEvent, useEffect, useState } from "react";
import { Crown, Gamepad2, History, LogOut, Medal, Sparkles, Star, UserRound, X } from "lucide-react";
import { CHARACTER_IDS, getGameHistory, getProfileStats, type CharacterId, type GameHistoryItem, type Profile, type ProfileStats } from "./identityClient";

interface Props { open:boolean; profile:Profile|null; busy:boolean; error:string; onClose:()=>void; onSave:(name:string,character:CharacterId)=>Promise<void>; onLogout:()=>Promise<void> }
export function ProfilePanel({open,profile,busy,error,onClose,onSave,onLogout}:Props){
  const [displayName,setDisplayName]=useState("");
  const [character,setCharacter]=useState<CharacterId>("character-1");
  const [history,setHistory]=useState<GameHistoryItem[]>([]);
  const [historyLoading,setHistoryLoading]=useState(false);
  const [historyError,setHistoryError]=useState("");
  const [stats,setStats]=useState<ProfileStats|null>(null);
  const [statsLoading,setStatsLoading]=useState(false);
  const [statsError,setStatsError]=useState("");
  useEffect(()=>{if(open){setDisplayName(profile?.displayName??"");setCharacter(profile?.selectedCharacterId??"character-1");}},[open,profile]);
  useEffect(()=>{if(!open)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose();};addEventListener("keydown",close);return()=>removeEventListener("keydown",close);},[open,onClose]);
  useEffect(()=>{
    if(!open||!profile){setHistory([]);setHistoryError("");setStats(null);setStatsError("");return;}
    let active=true;setHistoryLoading(true);setHistoryError("");setStatsLoading(true);setStatsError("");
    getGameHistory().then(items=>{if(active)setHistory(items);}).catch(()=>{if(active)setHistoryError("مش قادرين نحمّل سجل اللعب دلوقتي");}).finally(()=>{if(active)setHistoryLoading(false);});
    getProfileStats().then(value=>{if(active)setStats(value);}).catch(()=>{if(active){setStats(null);setStatsError("مش قادرين نحمّل إحصائياتك دلوقتي");}}).finally(()=>{if(active)setStatsLoading(false);});
    return()=>{active=false;};
  },[open,profile?.userId]);
  if(!open)return null;
  const submit=(event:FormEvent)=>{event.preventDefault();void onSave(displayName.trim(),character);};
  return <div className="profile-backdrop" role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget)onClose();}}>
    <section className="profile-sheet" role="dialog" aria-modal="true" aria-labelledby="profile-title">
      <div className="profile-sheet-head"><div><span className="profile-kicker">هويتك في اللعبة</span><h2 id="profile-title">{profile?"البروفايل":"اعمل بروفايل"}</h2></div><button type="button" className="profile-close" onClick={onClose} aria-label="إغلاق البروفايل"><X/></button></div>
      <p className="profile-note">احفظ اسمك وشخصيتك عشان يظهروا جاهزين كل مرة. تقدر تلعب من غير بروفايل عادي.</p>
      {error&&<div className="profile-error" role="alert">{error}</div>}
      <form className="profile-form" onSubmit={submit}>
        <label>اسم اللاعب<input autoFocus value={displayName} onChange={event=>setDisplayName(event.target.value)} minLength={2} maxLength={24} required placeholder="اكتب اسمك"/></label>
        <fieldset><legend>اختار شخصيتك</legend><div className="profile-character-grid">{CHARACTER_IDS.map((id,index)=><button key={id} type="button" className={character===id?"profile-character active":"profile-character"} aria-label={`شخصية ${index+1}`} aria-pressed={character===id} onClick={()=>setCharacter(id)}><span style={{backgroundPosition:`${(index%4)*33.333}% ${Math.floor(index/4)*50}%`}}/></button>)}</div></fieldset>
        <button className="primary" disabled={busy||displayName.trim().length<2} type="submit"><UserRound/>{busy?"بنحفظ…":profile?"حفظ التغييرات":"إنشاء البروفايل"}</button>
      </form>
      {profile&&<section className="profile-stats" aria-labelledby="stats-title">
        <div className="profile-history-head"><h3 id="stats-title"><Sparkles/> إحصائياتك</h3><span>من مبارياتك الحقيقية</span></div>
        {statsLoading?<div className="stats-loading" role="status" aria-live="polite"><span className="loader"/> بنحسب أرقامك…</div>:statsError?<div className="history-state error" role="alert">{statsError}</div>:stats&&<div className="stats-grid">
          <Stat icon={<Gamepad2/>} label="القعدات" value={stats.gamesPlayed}/>
          <Stat icon={<Crown/>} label="المكسب" value={stats.wins}/>
          <Stat icon={<Star/>} label="كل النقط" value={stats.totalScore}/>
          <Stat icon={<Medal/>} label="أعلى نتيجة" value={stats.bestScore}/>
          <Stat icon={<UserRound/>} label="متوسط المركز" value={stats.averageRank} suffix={stats.averageRank===null?"—":""}/>
        </div>}
      </section>}
      {profile&&<section className="profile-history" aria-labelledby="history-title">
        <div className="profile-history-head"><h3 id="history-title"><History/> سجل اللعب</h3><span>آخر ٢٠ قعدة</span></div>
        {historyLoading?<div className="history-state" role="status"><span className="loader"/> بنحمّل مبارياتك…</div>:historyError?<div className="history-state error" role="alert">{historyError}</div>:history.length===0?<div className="history-state">أول ما تخلّص قعدة بحسابك هتظهر هنا.</div>:<div className="history-list">{history.map(item=><article className="history-row" key={`${item.roomCode}-${item.finishedAt}`}>
          <div><b>المركز {arabicDigits(item.player.rank)}</b><small>{formatDate(item.finishedAt)}</small></div>
          <div className="history-score"><strong>{arabicDigits(item.player.score)}</strong><small>نقطة</small></div>
          <div className="history-meta"><span>{arabicDigits(item.playerCount)} لاعبين</span><code dir="ltr">{item.roomCode}</code></div>
        </article>)}</div>}
      </section>}
      {profile&&<button type="button" className="profile-logout" disabled={busy} onClick={()=>void onLogout()}><LogOut/> خروج من الحساب على كل الأجهزة</button>}
    </section>
  </div>;
}
const arabicDigits=(value:number)=>String(value).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[Number(d)]);
const formatDate=(timestamp:number)=>new Intl.DateTimeFormat("ar-EG",{day:"numeric",month:"short",year:"numeric"}).format(new Date(timestamp));
function Stat({icon,label,value,suffix=""}:{icon:React.ReactNode;label:string;value:number|null;suffix?:string}){
  return <div className="stat-card"><span className="stat-icon" aria-hidden="true">{icon}</span><div><strong>{value===null?suffix:arabicDigits(value)}</strong><small>{label}</small></div></div>;
}
