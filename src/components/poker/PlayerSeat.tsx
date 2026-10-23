import type { Player } from '@/lib/poker/types';
import { CardView } from './CardView';

const AVATAR_COLORS = ['#c9a227', '#3b82f6', '#ef4444', '#a855f7', '#14b8a6', '#f97316'];

interface Props {
  player: Player;
  isDealer: boolean;
  isActive: boolean;
  showCards: boolean;
  isWinner: boolean;
  isThinking: boolean;
  reverse?: boolean;
}

export function PlayerSeat({
  player,
  isDealer,
  isActive,
  showCards,
  isWinner,
  isThinking,
  reverse = false,
}: Props) {
  const busted = player.chips <= 0 && player.holeCards.length === 0 && player.isFolded;
  const faceUp = showCards || player.isHuman;
  const initial = player.name.slice(0, 1).toUpperCase();
  const hasFlags =
    isWinner ||
    (player.isAllIn && !player.isFolded) ||
    player.isFolded ||
    isThinking ||
    (isActive && player.isHuman && !player.isFolded);

  return (
    <div
      className={[
        'seat relative flex w-max max-w-[230px] items-center gap-1.5 transition duration-300',
        reverse ? 'flex-row-reverse' : 'flex-row',
        player.isFolded ? 'opacity-50' : '',
        busted ? 'opacity-30 grayscale' : '',
      ].join(' ')}
    >
      {player.holeCards.length > 0 && (
        <div
          className={`flex gap-1 transition duration-300 ${player.isFolded ? 'translate-y-1.5 -rotate-6 grayscale' : ''}`}
        >
          {player.holeCards.map((card, i) => (
            <CardView
              key={`${card.rank}${card.suit}-${faceUp ? 'up' : 'down'}`}
              card={card}
              faceDown={!faceUp}
              small
              delay={i * 90}
            />
          ))}
        </div>
      )}

      <div
        className={[
          'flex items-center gap-2 rounded-full border bg-[linear-gradient(180deg,rgba(28,32,40,0.94),rgba(14,16,22,0.94))] py-1 pr-2 pl-1 shadow-[0_8px_18px_rgba(0,0,0,0.35)]',
          player.isHuman ? 'border-[#e4c36a]/55' : 'border-[rgba(255,244,214,0.12)]',
          isActive ? 'animate-turn' : '',
          isWinner ? 'border-[#86efac] shadow-[0_0_22px_rgba(74,222,128,0.28)]' : '',
        ].join(' ')}
      >
        <span
          className="grid size-7 shrink-0 place-items-center rounded-full text-[0.78rem] font-extrabold text-[#140e05] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
          style={{ background: AVATAR_COLORS[player.id % AVATAR_COLORS.length] }}
        >
          {initial}
        </span>
        <div className="min-w-0 text-left">
          <div className="flex items-center gap-1 text-[0.78rem] leading-none font-bold text-[#f7f2e8]">
            <span className="max-w-[78px] truncate">{player.name}</span>
            {isDealer && (
              <span
                title="Dealer"
                className="grid size-4 shrink-0 place-items-center rounded-full border border-[#c9a227] bg-[#f7f4ee] text-[0.58rem] font-extrabold text-[#16120c]"
              >
                D
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[0.72rem] font-semibold text-[#e4c36a] tabular-nums">
            {player.chips.toLocaleString()}
          </div>
        </div>
      </div>

      {hasFlags && (
        <div className="absolute top-[calc(100%+3px)] left-1/2 flex -translate-x-1/2 gap-1 whitespace-nowrap">
          {isWinner && (
            <span className="rounded-full bg-[#d8f5e4] px-1.5 py-0.5 text-[0.58rem] font-extrabold tracking-wide text-[#14532d]">
              WIN
            </span>
          )}
          {player.isAllIn && !player.isFolded && (
            <span className="rounded-full bg-[#fecaca] px-1.5 py-0.5 text-[0.58rem] font-extrabold tracking-wide text-[#7f1d1d]">
              ALL-IN
            </span>
          )}
          {player.isFolded && (
            <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[0.58rem] font-extrabold tracking-wide text-[#d6d3cd]">
              FOLD
            </span>
          )}
          {isThinking && (
            <span className="animate-think rounded-full bg-[#e4c36a]/15 px-1.5 py-0.5 text-[0.58rem] font-extrabold tracking-wide text-[#f0d78c]">
              Thinking
            </span>
          )}
          {isActive && player.isHuman && !player.isFolded && (
            <span className="rounded-full bg-[#e4c36a] px-1.5 py-0.5 text-[0.58rem] font-extrabold tracking-wide text-[#1a1408]">
              Your turn
            </span>
          )}
        </div>
      )}

      {player.betThisStreet > 0 && (
        <div
          key={player.betThisStreet}
          className="absolute bottom-[calc(100%+4px)] left-1/2 inline-flex animate-chip items-center gap-1.5 rounded-full border border-[#e4c36a]/35 bg-[rgba(8,10,12,0.82)] py-0.5 pr-2 pl-1 text-[0.72rem] font-bold text-[#f7f2e8] tabular-nums"
        >
          <span
            aria-hidden
            className="size-3.5 rounded-full border-[1.5px] border-[#f4f1ea] bg-[radial-gradient(circle_at_50%_50%,transparent_0_3px,#1a1408_3.5px_4.5px,transparent_5px),repeating-conic-gradient(#f4f1ea_0_18deg,#c81e3a_0_36deg)]"
          />
          {player.betThisStreet.toLocaleString()}
        </div>
      )}
    </div>
  );
}
