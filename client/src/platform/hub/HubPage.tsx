import { ArrowUpLeft, Gamepad2, UsersRound } from "lucide-react";
import { GAME_REGISTRY } from "../gameRegistry";
import { MotionBackdrop } from "./MotionBackdrop";
import { GameCard } from "./GameCard";
import { useMotionPreference } from "./useMotionPreference";
import "../hub.css";

export function HubPage() {
  const motion = useMotionPreference();
  const flagship = GAME_REGISTRY.find((game) => game.id === "alhabeed")!;
  const collection = GAME_REGISTRY.filter((game) => game.id !== "alhabeed");
  return (
    <main className="hub-page" dir="rtl">
      <MotionBackdrop preference={motion} />
      <div className="hub-container">
        <div className="hub-hero">
          <div className="hub-hero__topline"><span className="hub-logo">الهَبِّيد</span><span className="hub-pill"><Gamepad2 size={15} aria-hidden="true" /> عالم اللِّمّة</span></div>
          <p className="hub-kicker">اللعبة تبدأ لما القعدة تكمل</p>
          <h1>ألعاب أصلية<br /><em>تتعمل لها لَمّة.</em></h1>
          <p className="hub-hero__copy">اختاروا لعبتكم، ابعتوا الدعوة، وخلو الضحك ياخد مساحته.</p>
          <button type="button" className="hub-scroll-link" onClick={() => document.getElementById("games")?.scrollIntoView({ behavior: motion === "full" ? "smooth" : "auto" })}>شوفوا الألعاب <ArrowUpLeft size={18} aria-hidden="true" /></button>
        </div>
        <section className="hub-section" id="games" aria-labelledby="featured-heading">
          <div className="hub-section__heading"><div><p className="hub-kicker">اختيار اللِّمّة</p><h2 id="featured-heading">ابدأوا بالهَبِّيد</h2></div><span className="hub-section__count"><UsersRound size={16} aria-hidden="true" /> 3–10 لاعبين</span></div>
          <GameCard game={flagship} featured />
        </section>
        <section className="hub-section hub-section--secondary" aria-labelledby="collection-heading">
          <div className="hub-section__heading"><div><p className="hub-kicker">على الطريق</p><h2 id="collection-heading">ألعاب اللِّمّة</h2></div><span className="hub-section__note">الجاي أحلى</span></div>
          <div className="hub-games-grid">{collection.map((game) => <GameCard key={game.id} game={game} />)}</div>
        </section>
        <footer className="hub-footer">مصنوع للِّي بيحبوا القعدة <span aria-hidden="true">✦</span> وبروح مصرية</footer>
      </div>
    </main>
  );
}
