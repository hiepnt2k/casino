'use client';

import { useEffect, useState } from 'react';
import type { GameState } from '@/lib/poker/types';
import { getCallAmount, getMinRaiseTotal, humanCanCheck } from '@/lib/poker/gameEngine';

interface Props {
  state: GameState;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onRaise: (amount: number) => void;
  onDeal: () => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const button =
  'min-w-[92px] cursor-pointer rounded-xl px-3 py-1.5 text-[0.82rem] font-extrabold transition hover:brightness-105 active:translate-y-px active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40';

export function ActionPanel({ state, onFold, onCheck, onCall, onRaise, onDeal }: Props) {
  const me = state.players.find((p) => p.isHuman)!;
  const heroToCall = Math.min(Math.max(0, state.currentBet - me.betThisStreet), me.chips);
  const callAmt = state.waitingForHuman ? getCallAmount(state) : heroToCall;
  const minRaiseAdd = getMinRaiseTotal(state);
  const canCheck = humanCanCheck(state);
  const maxRaise = me.chips;
  const sliderMin = Math.min(minRaiseAdd, maxRaise);
  const sliderMax = maxRaise;
  const showActions = state.waitingForHuman && !state.isHandOver;
  const aliveWithChips = state.players.filter((p) => p.chips > 0).length;
  const canRaise = me.chips > callAmt && sliderMax >= sliderMin;

  const [raiseAmt, setRaiseAmt] = useState(sliderMin);

  useEffect(() => {
    const potSized = Math.round(callAmt + Math.max(state.pot, state.bigBlind) * 0.66);
    setRaiseAmt(clamp(potSized, sliderMin, sliderMax));
  }, [state.handNumber, state.street, callAmt, sliderMin, sliderMax, state.pot, state.bigBlind]);

  const sized = clamp(raiseAmt, sliderMin, sliderMax);
  const presets = [
    { label: 'Min', amount: sliderMin },
    { label: '½ pot', amount: Math.round(callAmt + state.pot * 0.5) },
    { label: 'Pot', amount: Math.round(callAmt + state.pot) },
    { label: 'All-in', amount: maxRaise },
  ];

  return (
    <section className="mx-auto mb-1.5 flex w-[min(980px,calc(100%-16px))] shrink-0 animate-dock flex-col gap-1.5 rounded-[14px] border border-[#e4c36a]/20 bg-[linear-gradient(180deg,rgba(22,25,32,0.96),rgba(12,14,18,0.96))] px-2.5 py-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex shrink-0 gap-1.5">
          {[
            ['Stack', me.chips.toLocaleString()],
            ['Call', state.isHandOver ? '—' : heroToCall.toLocaleString()],
            ['Pot', state.pot.toLocaleString()],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline gap-1.5 rounded-full border border-white/5 bg-white/5 px-2 py-0.5"
            >
              <span className="text-[0.62rem] tracking-[0.08em] text-[#a89b86] uppercase">{label}</span>
              <strong className="text-[0.82rem] text-[#f7f2e8] tabular-nums">{value}</strong>
            </div>
          ))}
        </div>
        <p key={state.lastAction} className="min-w-0 flex-1 animate-status truncate text-right text-[0.82rem] text-[#e7dcc8]">
          {state.lastAction}
        </p>
      </div>

      {state.isHandOver ? (
        aliveWithChips >= 2 ? (
          <button
            className={`${button} mx-auto bg-[linear-gradient(180deg,#f0d78c,#c9a227)] text-[#1a1408] shadow-[0_6px_16px_rgba(201,162,39,0.25)]`}
            onClick={onDeal}
          >
            {state.handNumber === 0 ? 'Deal cards' : 'Next hand'}
          </button>
        ) : (
          <p className="text-center text-[0.82rem] text-[#e7dcc8]">
            {me.chips > 0 ? 'You cleaned the table.' : 'You are out. Refresh to play again.'}
          </p>
        )
      ) : showActions ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="flex flex-wrap justify-center gap-2">
            <button className={`${button} bg-[linear-gradient(180deg,#9a3d3d,#6e2424)] text-white`} onClick={onFold}>
              Fold
            </button>
            {canCheck ? (
              <button className={`${button} bg-[linear-gradient(180deg,#3c516e,#24344c)] text-[#f4f7fb]`} onClick={onCheck}>
                Check
              </button>
            ) : (
              <button className={`${button} bg-[linear-gradient(180deg,#3c516e,#24344c)] text-[#f4f7fb]`} onClick={onCall}>
                {callAmt >= me.chips ? `All-in ${me.chips.toLocaleString()}` : `Call ${callAmt.toLocaleString()}`}
              </button>
            )}
            {canRaise && (
              <button
                className={`${button} bg-[linear-gradient(180deg,#f0d78c,#c9a227)] text-[#1a1408] shadow-[0_6px_16px_rgba(201,162,39,0.25)]`}
                onClick={() => onRaise(sized)}
              >
                {state.currentBet === 0 ? 'Bet' : 'Raise'} {sized.toLocaleString()}
              </button>
            )}
          </div>

          {canRaise && sliderMax > sliderMin && (
            <div className="flex min-w-[min(360px,100%)] flex-1 items-center gap-2">
              <div className="flex flex-wrap justify-center gap-1.5">
                {presets.map((preset) => {
                  const amount = clamp(preset.amount, sliderMin, sliderMax);
                  const active = amount === sized;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      className={`cursor-pointer rounded-full border px-2.5 py-1 text-[0.75rem] font-bold ${active ? 'border-[#e4c36a] bg-[#e4c36a]/15 text-[#f0d78c]' : 'border-[#e4c36a]/30 bg-transparent text-[#e7dcc8] hover:border-[#e4c36a] hover:text-[#f0d78c]'}`}
                      onClick={() => setRaiseAmt(amount)}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <label className="flex flex-1 items-center gap-3 font-extrabold text-[#e4c36a] tabular-nums">
                <input
                  className="h-1 flex-1 accent-[#e4c36a]"
                  type="range"
                  min={sliderMin}
                  max={sliderMax}
                  step={state.bigBlind}
                  value={sized}
                  onChange={(e) => setRaiseAmt(Number(e.target.value))}
                />
                <span>{sized.toLocaleString()}</span>
              </label>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2.5 text-[0.85rem] font-semibold tracking-[0.04em] text-[#a89b86] uppercase">
          <span className="inline-flex gap-1" aria-hidden>
            <i className="size-1.5 animate-dot rounded-full bg-[#e4c36a]" />
            <i className="size-1.5 animate-dot rounded-full bg-[#e4c36a] [animation-delay:0.15s]" />
            <i className="size-1.5 animate-dot rounded-full bg-[#e4c36a] [animation-delay:0.3s]" />
          </span>
          Waiting for the table
        </div>
      )}
    </section>
  );
}
