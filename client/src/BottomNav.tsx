import { Bell, Gamepad2, LayoutGrid, Newspaper, UserRound } from "lucide-react";
import { NavLink } from "react-router-dom";

export type AppScreen = "home"|"create"|"join"|"local"|"news"|"notifications";

interface Props { onProfile?:()=>void; }

export function BottomNav({onProfile}:Props) {
  const item=(to:string,label:string,icon:React.ReactNode)=><NavLink to={to} className={({isActive})=>isActive?"bottom-nav-item active":"bottom-nav-item"}>{icon}<span>{label}</span></NavLink>;
  return <nav className="bottom-nav" aria-label="التنقل الرئيسي">
    {item("/","الرئيسية",<Gamepad2/>)}
    {item("/games/alhabeed/local","الفئات",<LayoutGrid/>)}
    {item("/news","الجديد",<Newspaper/>)}
    {item("/notifications","التنبيهات",<Bell/>)}
    <button type="button" className="bottom-nav-item" onClick={onProfile}><UserRound/><span>حسابي</span></button>
  </nav>;
}
