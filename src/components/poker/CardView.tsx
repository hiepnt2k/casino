import type { Card } from '@/lib/poker/types';
import { SUIT_SYMBOLS } from '@/lib/poker/types';

interface Props {
  card?: Card | null;
  faceDown?: boolean;
  small?: boolean;
  /** Stagger deal animation, in milliseconds. */
  delay?: number;
}

export function CardView({ card, faceDown = false, small = false, delay = 0 }: Props) {
  const size = small
    ? 'h-[74px] w-[52px] rounded-md'
    : 'board-card h-[100px] w-[72px] rounded-lg';
  const motion = { animationDelay: `${delay}ms` };

  if (!card && !faceDown) {
    return (
      <div
        className={`${size} shrink-0 border-[1.5px] border-dashed border-[rgba(255,244,214,0.22)] bg-black/15 shadow-[inset_0_0_12px_rgba(0,0,0,0.18)]`}
      />
    );
  }

  if (faceDown || !card) {
    return (
      <div
        className={`${size} relative grid shrink-0 place-items-center overflow-hidden border-2 border-[#e4c36a] bg-[radial-gradient(circle_at_50%_42%,#2a4d86_0%,#16325c_46%,#0d2242_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_18px_rgba(0,0,0,0.35)] animate-deal`}
        style={motion}
      >
        <span className="absolute inset-[5px] rounded-[5px] border border-[#e4c36a]/55 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.05)_0_2px,transparent_2px_6px)]" />
        <span className={`relative text-[#e4c36a] ${small ? 'text-sm' : 'text-lg'}`}>♠</span>
      </div>
    );
  }

  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  const label = card.rank === 'T' ? '10' : card.rank;
  const suit = SUIT_SYMBOLS[card.suit];

  return (
    <div
      className={`${size} relative shrink-0 border border-black/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.55),transparent_28%),linear-gradient(165deg,#fffdf8_0%,#f3ecdf_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_18px_rgba(0,0,0,0.35)] animate-deal ${red ? 'text-[#c81e3a]' : 'text-[#1c1915]'}`}
      style={motion}
    >
      <span className="absolute top-1 left-1.5 flex flex-col items-center leading-none not-italic">
        <b className={small ? 'text-[0.72rem]' : 'text-[1.05rem]'}>{label}</b>
        <i className={`not-italic ${small ? 'text-[0.62rem]' : 'text-[0.78rem]'}`}>{suit}</i>
      </span>
      <span className={`absolute inset-0 grid place-items-center leading-none ${small ? 'text-lg' : 'text-[2rem]'}`}>
        {suit}
      </span>
      <span className="absolute right-1.5 bottom-1 flex rotate-180 flex-col items-center leading-none">
        <b className={small ? 'text-[0.72rem]' : 'text-[1.05rem]'}>{label}</b>
        <i className={`not-italic ${small ? 'text-[0.62rem]' : 'text-[0.78rem]'}`}>{suit}</i>
      </span>
    </div>
  );
}
