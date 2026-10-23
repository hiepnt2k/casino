import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: { absolute: 'Casino' },
  description: 'Choose a game to play.',
};

const games = [
  {
    href: '/poker',
    mark: '♠',
    name: 'Texas Hold’em',
    detail: 'No-Limit · 6-max · you vs 5 AI bots',
  },
  {
    href: '/blackjack',
    mark: '21',
    name: 'Blackjack',
    detail: 'You vs the dealer · hit, stand, double',
  },
];

export default function HomePage() {
  return (
    <main className="flex h-dvh items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_70%_45%_at_50%_30%,rgba(36,92,58,0.28),transparent_70%),#090b10] px-6 text-[#f6f1e7]">
      <div className="w-full max-w-3xl">
        <p className="text-[0.72rem] font-bold tracking-[0.16em] text-[#a89b86] uppercase">Casino</p>
        <h1 className="mt-2 font-display text-5xl leading-none font-bold text-[#f0d78c]">Choose a game</h1>
        <ul className="mt-8 grid list-none gap-4 p-0 sm:grid-cols-2">
          {games.map((game) => (
            <li key={game.href}>
              <Link
                href={game.href}
                className="group flex items-center gap-4 rounded-2xl border border-[#e4c36a]/30 bg-[rgba(16,18,24,0.82)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.35)] transition hover:border-[#e4c36a] hover:bg-[rgba(22,25,32,0.94)]"
              >
                <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-[linear-gradient(160deg,#f0d78c,#b8892d)] text-xl font-extrabold text-[#1a1408]">
                  {game.mark}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-3xl leading-none font-bold">{game.name}</span>
                  <span className="mt-1 block text-sm text-[#a89b86]">{game.detail}</span>
                </span>
                <span className="rounded-full bg-[linear-gradient(180deg,#f0d78c,#c9a227)] px-4 py-2 text-sm font-extrabold text-[#1a1408] transition group-hover:brightness-105">
                  Play
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
