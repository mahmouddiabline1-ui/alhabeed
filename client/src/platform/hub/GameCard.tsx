import { ArrowUpLeft, LockKeyhole, Sparkles, Users } from "lucide-react";
import type { GameDefinition } from "../gameRegistry";
import { Link } from "react-router-dom";

function AlhabeedMark() {
  return <div className="game-card__mark game-card__mark--alhabeed" aria-hidden="true"><span>ه</span><i /><i /><i /></div>;
}

export function hubCoverUrl(assetId: string, baseUrl = import.meta.env.BASE_URL) {
  return `${baseUrl.replace(/\/?$/u, "/")}games/${assetId}.svg`;
}

export function GameCard({ game, featured = false }: { game: GameDefinition; featured?: boolean }) {
  const localPlayable = game.availability.local === "playable" && game.routes.local;
  const onlinePlayable = game.availability.online === "playable" && game.routes.online;
  const cover = game.id === "alhabeed" ? null : hubCoverUrl(game.coverAssetId);
  return (
    <article className={`game-card ${featured ? "game-card--featured" : ""}`} data-game-id={game.id} data-testid={`game-card-${game.id}`} style={{ "--game-accent": game.accent } as React.CSSProperties}>
      <div className="game-card__art">
        {cover ? <img src={cover} alt="" loading="lazy" /> : <AlhabeedMark />}
        <span className="game-card__art-label">{featured ? "اللعبة الرئيسية" : "قريبًا"}</span>
      </div>
      <div className="game-card__body">
        <p className="game-card__eyebrow">{game.eyebrow}</p>
        <h3>{game.title}</h3>
        <p className="game-card__description">{game.description}</p>
        <div className="game-card__meta"><span><Users size={15} aria-hidden="true" />{game.playerCount.label}</span>{!featured && <span className="game-card__status"><LockKeyhole size={14} aria-hidden="true" />قريبًا</span>}</div>
        {(localPlayable || onlinePlayable) && <div className="game-card__actions">
          {localPlayable && <Link className="hub-button hub-button--soft" to={game.routes.local!}>العب على نفس الجهاز <ArrowUpLeft size={17} aria-hidden="true" /></Link>}
          {onlinePlayable && <Link className="hub-button hub-button--primary" to={game.routes.online!}>العب أونلاين <Sparkles size={17} aria-hidden="true" /></Link>}
        </div>}
      </div>
    </article>
  );
}
