import { FormEvent, useEffect, useState } from "react";
import { LogOut, UserRound, X } from "lucide-react";
import { CHARACTER_IDS, type CharacterId, type Profile } from "./identityClient";

interface Props { open:boolean; profile:Profile|null; busy:boolean; error:string; onClose:()=>void; onSave:(name:string,character:CharacterId)=>Promise<void>; onLogout:()=>Promise<void> }
export function ProfilePanel({open,profile,busy,error,onClose,onSave,onLogout}:Props){
  const [displayName,setDisplayName]=useState("");
  const [character,setCharacter]=useState<CharacterId>("character-1");
  useEffect(()=>{if(open){setDisplayName(profile?.displayName??"");setCharacter(profile?.selectedCharacterId??"character-1");}},[open,profile]);
  useEffect(()=>{if(!open)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose();};addEventListener("keydown",close);return()=>removeEventListener("keydown",close);},[open,onClose]);
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
      {profile&&<button type="button" className="profile-logout" disabled={busy} onClick={()=>void onLogout()}><LogOut/> خروج من الحساب على كل الأجهزة</button>}
    </section>
  </div>;
}
