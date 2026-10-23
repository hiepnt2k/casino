'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { GameState, Street } from '@/lib/poker/types';
import { applyAction, createInitialState, startNewHand } from '@/lib/poker/gameEngine';
import { decideBotAction } from '@/lib/poker/ai';
import { CardView } from './CardView';
import { PlayerSeat } from './PlayerSeat';
import { ActionPanel } from './ActionPanel';
import { WinPopup } from './WinPopup';

const SEAT_LAYOUT = [
  { className: 'absolute bottom-0 left-1/2 z-[2] -translate-x-1/2', reverse: false },
  { className: 'absolute top-[70%] left-0 z-[2] -translate-y-1/2', reverse: false },
  { className: 'absolute top-[32%] left-0 z-[2] -translate-y-1/2', reverse: false },
  { className: 'absolute top-0 left-1/2 z-[2] -translate-x-1/2', reverse: false },
  { className: 'absolute top-[32%] right-0 z-[2] -translate-y-1/2', reverse: true },
  { className: 'absolute top-[70%] right-0 z-[2] -translate-y-1/2', reverse: true },
];

const STREET_STEPS: { id: Street; label: string }[] = [
  { id: 'preflop', label: 'Preflop' },
  { id: 'flop', label: 'Flop' },
  { id: 'turn', label: 'Turn' },
  { id: 'river', label: 'River' },
];

function streetRank(street: Street) {
  if (street === 'showdown') return STREET_STEPS.length;
  return STREET_STEPS.findIndex((step) => step.id === street);
}

export function GameTable() {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [potPulse, setPotPulse] = useState(false);
  const turnKey = useRef(0);
  const prevPot = useRef(state.pot);

  useEffect(() => {
    if (state.pot === prevPot.current) return;
    const grew = state.pot > prevPot.current;
    prevPot.current = state.pot;
    if (!grew) return;
    setPotPulse(true);
    const t = window.setTimeout(() => setPotPulse(false), 420);
    return () => window.clearTimeout(t);
  }, [state.pot]);

  useEffect(() => {
    if (state.isHandOver || state.waitingForHuman) return;
    const bot = state.players[state.currentPlayerIndex];
    if (!bot || bot.isHuman || bot.isFolded || bot.isAllIn) return;

    const key = ++turnKey.current;
    const delay = 1600 + Math.random() * 1400;
    const t = setTimeout(() => {
      setState((current) => {
        if (key !== turnKey.current) return current;
        if (current.isHandOver || current.waitingForHuman) return current;
        const cur = current.players[current.currentPlayerIndex];
        if (!cur || cur.isHuman || cur.id !== bot.id) return current;
        return applyAction(current, decideBotAction(current, cur));
      });
    }, delay);
    return () => clearTimeout(t);
  }, [state]);

  const onDeal = () => setState((s) => startNewHand(s));
  const onFold = () => setState((s) => applyAction(s, { type: 'fold' }));
  const onCheck = () => setState((s) => applyAction(s, { type: 'check' }));
  const onCall = () => setState((s) => applyAction(s, { type: 'call' }));
  const onRaise = (amount: number) => setState((s) => applyAction(s, { type: 'raise', amount }));

  const showdown = state.street === 'showdown' || state.isHandOver;
  const winnerIds = new Set(state.winners.map((w) => w.playerId));
  const rank = state.handNumber === 0 ? -1 : streetRank(state.street);

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-[radial-gradient(ellipse_70%_45%_at_50%_42%,rgba(36,92,58,0.28),transparent_70%),radial-gradient(ellipse_at_50%_100%,rgba(0,0,0,0.45),transparent_50%),#090b10] text-[#f6f1e7]">
      <header className="mx-auto mt-2 grid w-[min(1080px,calc(100%-24px))] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-[rgba(255,244,214,0.08)] bg-[rgba(16,18,24,0.72)] px-3 py-2 backdrop-blur-md max-[760px]:grid-cols-1 max-[760px]:justify-items-center">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="grid size-[38px] place-items-center rounded-xl bg-[linear-gradient(160deg,#f0d78c,#b8892d)] text-xl text-[#1a1408] shadow-[0_6px_16px_rgba(201,162,39,0.25)]"
            aria-label="Back to games"
          >
            ♠
          </Link>
          <div>
            <h1 className="font-display text-[1.55rem] leading-none font-bold tracking-wide">Poker Arena</h1>
            <p className="mt-0.5 text-[0.72rem] tracking-[0.06em] text-[#a89b86] uppercase">
              No-Limit Hold&apos;em · 6-max
            </p>
          </div>
        </div>

        <ol className="m-0 flex list-none gap-1.5 p-0" aria-label="Street">
          {STREET_STEPS.map((step, index) => (
            <li
              key={step.id}
              className={[
                'min-w-[68px] rounded-full px-2 py-1.5 text-center text-[0.72rem] font-bold tracking-wide uppercase max-[760px]:min-w-0',
                index === rank
                  ? 'animate-street bg-[linear-gradient(180deg,#f0d78c,#c9a227)] text-[#1a1408]'
                  : index < rank
                    ? 'bg-white/5 text-[#d7ccb8]'
                    : 'bg-white/5 text-[#8d8272]',
              ].join(' ')}
            >
              {step.label}
            </li>
          ))}
        </ol>

        <div className="flex justify-end gap-4 text-[0.78rem] text-[#a89b86] max-[760px]:justify-center">
          <span>
            Hand <strong className="ml-1 text-[#f6f1e7] tabular-nums">{state.handNumber || '—'}</strong>
          </span>
          <span>
            Blinds{' '}
            <strong className="ml-1 text-[#f6f1e7] tabular-nums">
              {state.smallBlind}/{state.bigBlind}
            </strong>
          </span>
        </div>
      </header>

      <main className="relative mx-auto my-1 min-h-0 w-[min(1080px,calc(100%-12px))] flex-1 [container-name:stage] [container-type:size]">
        <div className="absolute top-[11%] right-[15%] bottom-[12%] left-[15%] rounded-[50%] border-[14px] border-[#5a3a22] bg-[radial-gradient(ellipse_at_50%_42%,rgba(255,255,255,0.1),transparent_36%),radial-gradient(ellipse_at_50%_55%,#1c9a5c_0%,#0d6a3e_48%,#084e2e_100%)] shadow-[inset_0_0_0_2px_rgba(228,195,106,0.45),inset_0_0_70px_rgba(0,0,0,0.38),0_0_0_8px_#2a1a10,0_22px_50px_rgba(0,0,0,0.45)] max-[760px]:right-[20%] max-[760px]:left-[20%] max-[760px]:border-8 after:pointer-events-none after:absolute after:inset-[18px] after:rounded-[50%] after:border after:border-[rgba(255,244,214,0.12)]">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5">
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map((i) => {
                const card = state.communityCards[i];
                return (
                  <CardView
                    key={card ? `${card.rank}${card.suit}` : `slot-${i}`}
                    card={card ?? null}
                    delay={i * 110}
                  />
                );
              })}
            </div>
            <div
              className={`flex items-center gap-2.5 rounded-full border border-[#e4c36a]/35 bg-[rgba(6,16,10,0.62)] py-1.5 pr-3.5 pl-2 text-[#f6f1e7] ${potPulse ? 'animate-pot' : ''}`}
            >
              <span className="relative h-[26px] w-[22px]" aria-hidden>
                <i className="absolute bottom-0 left-0.5 size-[18px] rounded-full border-[1.5px] border-[#f4f1ea] bg-[radial-gradient(circle_at_50%_50%,transparent_0_4px,#1a1408_4.5px_5.5px,transparent_6px),repeating-conic-gradient(#f7f4ee_0_20deg,#1d4ed8_0_40deg)]" />
                <i className="absolute bottom-1 left-0.5 size-[18px] rounded-full border-[1.5px] border-[#f4f1ea] bg-[radial-gradient(circle_at_50%_50%,transparent_0_4px,#1a1408_4.5px_5.5px,transparent_6px),repeating-conic-gradient(#f7f4ee_0_20deg,#b91c1c_0_40deg)]" />
                <i className="absolute bottom-2 left-0.5 size-[18px] rounded-full border-[1.5px] border-[#f4f1ea] bg-[radial-gradient(circle_at_50%_50%,transparent_0_4px,#1a1408_4.5px_5.5px,transparent_6px),repeating-conic-gradient(#f7f4ee_0_20deg,#15803d_0_40deg)]" />
              </span>
              <div>
                <span className="block text-[0.62rem] tracking-[0.12em] text-[#d7ccb8] uppercase">Pot</span>
                <strong className="block text-[1.15rem] leading-tight text-[#f0d78c] tabular-nums">
                  {state.pot.toLocaleString()}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {state.players.map((player, i) => {
          const pos = SEAT_LAYOUT[i];
          const showCards = player.isHuman || (showdown && !player.isFolded && state.handNumber > 0);
          const isActive = !state.isHandOver && state.currentPlayerIndex === i;
          return (
            <div key={player.id} className={pos.className}>
              <PlayerSeat
                player={player}
                isDealer={state.handNumber > 0 && i === state.dealerIndex}
                isActive={isActive}
                showCards={showCards}
                isWinner={winnerIds.has(player.id) && state.isHandOver}
                isThinking={isActive && !player.isHuman}
                reverse={pos.reverse}
              />
            </div>
          );
        })}

        {state.isHandOver && state.handNumber > 0 && (
          <WinPopup winners={state.winners} players={state.players} />
        )}
      </main>

      <ActionPanel
        state={state}
        onFold={onFold}
        onCheck={onCheck}
        onCall={onCall}
        onRaise={onRaise}
        onDeal={onDeal}
      />
    </div>
  );
}
