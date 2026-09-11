import { Bell, Gamepad2, LayoutGrid, Newspaper, UserRound } from "lucide-react";

export type AppScreen = "home"|"create"|"join"|"local"|"news"|"notifications";

interface Props {
  screen:AppScreen;
  onNavigate:(screen:AppScreen)=>void;
  onProfile:()=>void;
}

export function BottomNav({screen,onNavigate,onProfile}:Props) {
  const item=(target:AppScreen,label:string,icon:React.ReactNode)=>
    <button type="button" className={screen===target?"bottom-nav-item active":"bottom-nav-item"} onClick={()=>onNavigate(target)} aria-current={screen===target?"page":undefined}>{icon}<span>{label}</span></button>;
  return <nav className="bottom-nav" aria-label="التنقل الرئيسي">
    {item("home","الرئيسية",<Gamepad2/>)}
    {item("local","الفئات",<LayoutGrid/>)}
    {item("news","الجديد",<Newspaper/>)}
    {item("notifications","التنبيهات",<Bell/>)}
    <button type="button" className="bottom-nav-item" onClick={onProfile}><UserRound/><span>حسابي</span></button>
  </nav>;
}
