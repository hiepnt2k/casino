'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CardView } from '@/components/poker/CardView';
import {
  createBjState,
  dealHand,
  dealerStep,
  doubleDown,
  handTotal,
  hit,
  nextBet,
  stand,
  type BjState,
} from '@/lib/blackjack/engine';

const PRESETS = [25, 50, 100, 200];

export function BlackjackTable() {
  const [state, setState] = useState<BjState>(() => createBjState());
  const [wager, setWager] = useState(50);

  useEffect(() => {
    if (state.phase !== 'dealer') return;
    const t = window.setTimeout(() => setState((current) => dealerStep(current)), 700);
    return () => window.clearTimeout(t);
  }, [state]);

  const visibleDealer = state.dealerHoleHidden ? state.dealer.slice(0, 1) : state.dealer;
  const playerTotal = state.player.length ? handTotal(state.player) : 0;
  const dealerTotal = visibleDealer.length ? handTotal(visibleDealer) : 0;
  const canDouble = state.phase === 'player' && state.player.length === 2 && state.bankroll >= state.bet;
  const sized = Math.min(Math.max(wager, 1), state.bankroll);

  return (
    <div className="relative flex h-dvh max-h-dvh flex-col overflow-hidden bg-[radial-gradient(ellipse_70%_45%_at_50%_42%,rgba(36,92,58,0.28),transparent_70%),radial-gradient(ellipse_at_50%_100%,rgba(0,0,0,0.45),transparent_50%),#090b10] text-[#f6f1e7]">
      <header className="mx-auto mt-2 grid w-[min(1080px,calc(100%-24px))] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-[rgba(255,244,214,0.08)] bg-[rgba(16,18,24,0.72)] px-3 py-2 backdrop-blur-md max-[760px]:grid-cols-1 max-[760px]:justify-items-center">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            aria-label="Back to games"
            className="grid size-[38px] place-items-center rounded-xl bg-[linear-gradient(160deg,#f0d78c,#b8892d)] text-sm font-extrabold text-[#1a1408] shadow-[0_6px_16px_rgba(201,162,39,0.25)]"
          >
            21
          </Link>
          <div>
            <h1 className="font-display text-[1.55rem] leading-none font-bold tracking-wide">Blackjack</h1>
            <p className="mt-0.5 text-[0.72rem] tracking-[0.06em] text-[#a89b86] uppercase">
              Dealer stands on 17 · Blackjack pays 3:2
            </p>
          </div>
        </div>
        <p className="m-0 text-sm text-[#e7dcc8]">{state.message}</p>
        <div className="flex justify-end text-[0.78rem] text-[#a89b86]">
          Bankroll <strong className="ml-1 text-[#f6f1e7] tabular-nums">{state.bankroll.toLocaleString()}</strong>
        </div>
      </header>

      <main className="relative mx-auto my-1 min-h-0 w-[min(1080px,calc(100%-12px))] flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-x-[6%] inset-y-[2%] flex flex-col items-center justify-evenly rounded-[42px] border-[12px] border-[#5a3a22] bg-[radial-gradient(ellipse_at_50%_42%,rgba(255,255,255,0.1),transparent_36%),radial-gradient(ellipse_at_50%_55%,#1c9a5c_0%,#0d6a3e_48%,#084e2e_100%)] px-6 shadow-[inset_0_0_0_2px_rgba(228,195,106,0.45),inset_0_0_70px_rgba(0,0,0,0.38),0_0_0_8px_#2a1a10,0_22px_50px_rgba(0,0,0,0.45)] max-[760px]:inset-x-[2%] max-[760px]:border-8">
          <HandRow label="Dealer" total={state.dealer.length ? dealerTotal : null} hiddenHole={state.dealerHoleHidden}>
            {state.dealer.map((card, index) => (
              <CardView
                key={`${card.rank}${card.suit}-${index}`}
                card={card}
                small
                faceDown={state.dealerHoleHidden && index === 1}
                delay={index * 120}
              />
            ))}
          </HandRow>

          {state.bet > 0 && (
            <div className="rounded-full border border-[#e4c36a]/35 bg-[rgba(6,16,10,0.62)] px-4 py-1.5 text-sm">
              Bet <strong className="ml-1 text-[#f0d78c] tabular-nums">{state.bet.toLocaleString()}</strong>
            </div>
          )}

          <HandRow label="You" total={state.player.length ? playerTotal : null}>
            {state.player.map((card, index) => (
              <CardView key={`${card.rank}${card.suit}-${index}`} card={card} small delay={index * 120} />
            ))}
          </HandRow>
        </div>

      </main>

      <section className="relative z-10 mx-auto mb-1.5 flex w-[min(980px,calc(100%-16px))] shrink-0 flex-col items-center gap-2 rounded-[14px] border border-[#e4c36a]/20 bg-[linear-gradient(180deg,rgba(22,25,32,0.96),rgba(12,14,18,0.96))] px-3 py-2">
        {state.phase === 'betting' && state.bankroll > 0 && (
          <>
            <div className="flex flex-wrap justify-center gap-1.5">
              {PRESETS.filter((amount) => amount <= state.bankroll).map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className={`cursor-pointer rounded-full border px-3 py-1 text-sm font-bold ${sized === amount ? 'border-[#e4c36a] bg-[#e4c36a]/15 text-[#f0d78c]' : 'border-[#e4c36a]/30 text-[#e7dcc8]'}`}
                  onClick={() => setWager(amount)}
                >
                  {amount}
                </button>
              ))}
              <button
                type="button"
                className="cursor-pointer rounded-full border border-[#e4c36a]/30 px-3 py-1 text-sm font-bold text-[#e7dcc8]"
                onClick={() => setWager(state.bankroll)}
              >
                Max
              </button>
            </div>
            <button
              className="cursor-pointer rounded-xl bg-[linear-gradient(180deg,#f0d78c,#c9a227)] px-6 py-2 text-sm font-extrabold text-[#1a1408]"
              onClick={() => setState((current) => dealHand(current, sized))}
            >
              Deal {sized.toLocaleString()}
            </button>
          </>
        )}

        {state.phase === 'player' && (
          <div className="flex flex-wrap justify-center gap-2">
            <button className={actionClass('danger')} onClick={() => setState(hit)}>
              Hit
            </button>
            <button className={actionClass('secondary')} onClick={() => setState(stand)}>
              Stand
            </button>
            {canDouble && (
              <button className={actionClass('primary')} onClick={() => setState(doubleDown)}>
                Double
              </button>
            )}
          </div>
        )}

        {state.phase === 'dealer' && (
          <p className="m-0 text-sm font-semibold tracking-[0.08em] text-[#a89b86] uppercase">Dealer is playing</p>
        )}

        {state.phase === 'settled' && (
          <button
            className="cursor-pointer rounded-xl bg-[linear-gradient(180deg,#f0d78c,#c9a227)] px-6 py-2 text-sm font-extrabold text-[#1a1408]"
            onClick={() => setState(state.bankroll > 0 ? nextBet : createBjState)}
          >
            {state.bankroll > 0 ? 'Next hand' : 'New shoe'}
          </button>
        )}

        {state.phase === 'betting' && state.bankroll <= 0 && (
          <button
            className="cursor-pointer rounded-xl bg-[linear-gradient(180deg,#f0d78c,#c9a227)] px-6 py-2 text-sm font-extrabold text-[#1a1408]"
            onClick={() => setState(createBjState())}
          >
            New shoe
          </button>
        )}
      </section>

      {state.phase === 'settled' && state.outcome && (
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 z-20 w-[min(360px,86%)] animate-win rounded-[18px] border border-[#e4c36a]/65 bg-[rgba(8,10,14,0.92)] px-5 py-4 text-center shadow-[0_22px_50px_rgba(0,0,0,0.5)]"
          role="status"
        >
          <p className="m-0 text-[0.64rem] font-bold tracking-[0.14em] text-[#a89b86] uppercase">Result</p>
          <h2 className="mt-1 font-display text-5xl leading-none font-bold text-[#f0d78c]">{outcomeTitle(state.outcome)}</h2>
          <p className="mt-2 text-sm text-[#e7dcc8]">{state.message}</p>
          <p className={`mt-2 text-lg font-extrabold tabular-nums ${chipClass(state.outcome)}`}>{chipLine(state)}</p>
        </div>
      )}
    </div>
  );
}

function HandRow({
  label,
  total,
  hiddenHole = false,
  children,
}: {
  label: string;
  total: number | null;
  hiddenHole?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex min-h-4 items-center justify-center gap-2">{children}</div>
      <div className="rounded-full bg-black/40 px-3 py-1 text-xs font-bold tracking-wide text-[#f7f2e8] uppercase">
        {label}
        {total !== null && (
          <span className="ml-2 text-[#f0d78c] tabular-nums">{hiddenHole ? `${total}+` : total}</span>
        )}
      </div>
    </div>
  );
}

function chipLine(state: BjState) {
  const net = state.payout - state.bet;
  if (net > 0) return `+${net.toLocaleString()}`;
  if (net < 0) return net.toLocaleString();
  return '+0';
}

function chipClass(outcome: NonNullable<BjState['outcome']>) {
  if (outcome === 'win' || outcome === 'blackjack') return 'text-[#86efac]';
  if (outcome === 'push') return 'text-[#f0d78c]';
  return 'text-[#f0a8a8]';
}

function outcomeTitle(outcome: NonNullable<BjState['outcome']>) {
  if (outcome === 'blackjack') return 'Blackjack';
  if (outcome === 'win') return 'You win';
  if (outcome === 'push') return 'Push';
  if (outcome === 'bust') return 'Bust';
  return 'Dealer wins';
}

function actionClass(kind: 'danger' | 'secondary' | 'primary') {
  const base = 'cursor-pointer rounded-xl px-5 py-2 text-sm font-extrabold';
  if (kind === 'danger') return `${base} bg-[linear-gradient(180deg,#9a3d3d,#6e2424)] text-white`;
  if (kind === 'primary') return `${base} bg-[linear-gradient(180deg,#f0d78c,#c9a227)] text-[#1a1408]`;
  return `${base} bg-[linear-gradient(180deg,#3c516e,#24344c)] text-[#f4f7fb]`;
}
