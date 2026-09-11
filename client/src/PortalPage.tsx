import { Bell, Newspaper } from "lucide-react";

export function PortalPage({kind}:{kind:"news"|"notifications"}) {
  const news=kind==="news";
  return <main className="portal-page">
    <section className="portal-heading">
      <span className="portal-heading-icon">{news?<Newspaper/>:<Bell/>}</span>
      <div><span>{news?"كل جديد في اللعبة":"مركز التنبيهات"}</span><h1>{news?"آخر الأخبار":"التنبيهات"}</h1></div>
    </section>
    <section className="portal-empty" role="status">
      {news?<Newspaper/>:<Bell/>}
      <h2>{news?"مفيش أخبار منشورة دلوقتي":"أنت تمام، مفيش تنبيهات"}</h2>
      <p>{news?"أول تحديث رسمي للعبة هيظهر هنا من الباك إند.":"دعوات القعدات وتحديثات الحساب هتظهر هنا لما توصل."}</p>
    </section>
  </main>;
}
