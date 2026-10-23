import type { GameState, Player } from '@/lib/poker/types';
import { CardView } from './CardView';

interface Props {
  winners: GameState['winners'];
  players: Player[];
}

export function WinPopup({ winners, players }: Props) {
  if (winners.length === 0) return null;

  const rows = winners.map((winner) => {
    const player = players.find((p) => p.id === winner.playerId);
    return {
      ...winner,
      name: player?.name ?? 'Player',
      bestCards: winner.cards ?? [],
    };
  });

  return (
    <div
      className="pointer-events-none absolute top-[42%] left-1/2 z-[6] flex w-[min(460px,92%)] min-w-[280px] animate-win flex-col gap-2 rounded-[18px] border border-[#e4c36a]/65 bg-[rgba(8,10,14,0.9)] px-4 py-3.5 text-center shadow-[0_22px_50px_rgba(0,0,0,0.5)]"
      role="status"
      aria-live="polite"
    >
      {rows.map((row) => (
        <div key={row.playerId} className="[&+&]:border-t [&+&]:border-[#e4c36a]/25 [&+&]:pt-2">
          <p className="m-0 text-[0.64rem] font-bold tracking-[0.14em] text-[#a89b86] uppercase">
            {row.handName ? 'Winning hand' : 'Pot awarded'}
          </p>
          <h2 className="mt-0.5 font-display text-[2.15rem] leading-none font-bold text-[#f0d78c]">
            {row.handName ?? 'Everyone folded'}
          </h2>
          {row.bestCards.length > 0 && (
            <div className="mt-2 flex justify-center gap-1.5">
              {row.bestCards.map((card, index) => (
                <CardView key={`${card.rank}${card.suit}`} card={card} small delay={index * 70} />
              ))}
            </div>
          )}
          <p className="mt-2 flex items-baseline justify-center gap-2 text-[0.92rem] font-bold text-[#f7f2e8]">
            <span>{row.name}</span>
            <strong className="text-[#86efac] tabular-nums">+{row.amount.toLocaleString()}</strong>
          </p>
        </div>
      ))}
    </div>
  );
}
