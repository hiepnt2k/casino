import type { ActionResult, Card, GameState, Player } from './types';
import { createDeck, removeCards, shuffle } from './deck';
import { evaluateHand, preflopStrength } from './handEvaluator';

const MONTE_CARLO_SAMPLES = 400;

/**
 * Estimate win probability via Monte Carlo: deal remaining board +
 * random opponent hole cards from remaining deck.
 */
function estimateEquity(
  hole: Card[],
  community: Card[],
  numOpponents: number,
  samples = MONTE_CARLO_SAMPLES,
): number {
  const known = [...hole, ...community];
  const remaining = removeCards(createDeck(), known);
  const needBoard = 5 - community.length;
  let wins = 0;
  let ties = 0;

  for (let i = 0; i < samples; i++) {
    const deck = shuffle([...remaining]);
    let idx = 0;
    const board = [...community];
    for (let b = 0; b < needBoard; b++) board.push(deck[idx++]);

    const myScore = evaluateHand([...hole, ...board]).score;
    let bestOpp = -1;
    let oppTiesWithBest = 0;

    for (let o = 0; o < numOpponents; o++) {
      const oppHole = [deck[idx++], deck[idx++]];
      const oppScore = evaluateHand([...oppHole, ...board]).score;
      if (oppScore > bestOpp) {
        bestOpp = oppScore;
        oppTiesWithBest = 1;
      } else if (oppScore === bestOpp) {
        oppTiesWithBest++;
      }
    }

    if (myScore > bestOpp) wins++;
    else if (myScore === bestOpp) ties += 1 / (oppTiesWithBest + 1);
  }

  return (wins + ties) / samples;
}

function activeOpponents(state: GameState, me: Player): number {
  return state.players.filter(
    (p) => p.id !== me.id && !p.isFolded && p.chips + p.betThisStreet > 0,
  ).length;
}

function toCall(state: GameState, me: Player): number {
  return Math.min(state.currentBet - me.betThisStreet, me.chips);
}

function potOdds(state: GameState, me: Player): number {
  const call = toCall(state, me);
  if (call <= 0) return 0;
  return call / (state.pot + call);
}

function positionFactor(state: GameState, me: Player): number {
  const active = state.players.filter((p) => !p.isFolded);
  const n = active.length;
  if (n <= 1) return 1;
  const myIdx = active.findIndex((p) => p.id === me.id);
  // Later position (closer to dealer acting last postflop) = higher factor
  // Approximate: seats after dealer act later
  const dealerInActive = active.findIndex(
    (p) => p.id === state.players[state.dealerIndex].id,
  );
  const relative = (myIdx - dealerInActive + n) % n;
  // relative 0 = dealer (best postflop), n-1 = SB (worst)
  return 0.85 + (relative === 0 ? 0.2 : (n - 1 - relative) / (n - 1) * 0.2);
}

function canCheck(state: GameState, me: Player): boolean {
  return state.currentBet === me.betThisStreet;
}

function raiseSize(state: GameState, me: Player, equity: number): number {
  const call = toCall(state, me);
  const pot = state.pot + call;
  // Value bet sizing: larger with stronger hands
  let fraction = 0.55 + equity * 0.45; // 55%–100% pot
  if (state.street === 'preflop') fraction = 2.2 + equity * 1.5; // in BB units handled below

  let amount: number;
  if (state.currentBet === 0 || (state.street === 'preflop' && state.currentBet <= state.bigBlind)) {
    if (state.street === 'preflop') {
      amount = Math.round(state.bigBlind * (2.5 + equity * 3));
    } else {
      amount = Math.max(state.minRaise, Math.round(pot * fraction));
    }
  } else {
    // Raise: call + extra
    const raiseExtra = Math.max(state.minRaise, Math.round(pot * fraction));
    amount = call + raiseExtra;
  }

  amount = Math.min(amount, me.chips);
  // Ensure legal raise if chips allow
  const minTotal = state.currentBet - me.betThisStreet + state.minRaise;
  if (amount < Math.min(minTotal, me.chips) && me.chips > toCall(state, me)) {
    amount = Math.min(Math.max(minTotal, amount), me.chips);
  }
  return amount;
}

/**
 * Elite TAG AI: tight preflop, equity-driven postflop,
 * pot-odds aware, position-adjusted, controlled aggression + semi-bluffs.
 */
export function decideBotAction(state: GameState, me: Player): ActionResult {
  const callAmt = toCall(state, me);
  const opponents = activeOpponents(state, me);
  const pos = positionFactor(state, me);

  let equity: number;
  if (state.street === 'preflop') {
    // Blend chart strength with light MC when few cards known
    const chart = preflopStrength(me.holeCards);
    const mc = estimateEquity(me.holeCards, state.communityCards, opponents, 200);
    equity = chart * 0.55 + mc * 0.45;
  } else {
    equity = estimateEquity(me.holeCards, state.communityCards, opponents);
  }

  equity *= pos; // slight position boost
  equity = Math.min(0.98, equity);

  const odds = potOdds(state, me);
  const spr = me.chips / Math.max(1, state.pot); // stack-to-pot ratio
  const committed = me.betThisStreet + me.totalBet > me.chips * 0.35;

  // --- Fold / Call / Raise decision tree ---

  if (canCheck(state, me)) {
    // No bet to us
    if (equity >= 0.72 || (equity >= 0.58 && state.street !== 'preflop')) {
      return { type: 'raise', amount: raiseSize(state, me, equity) };
    }
    // Semi-bluff: decent equity / draws (MC captures draw equity)
    if (equity >= 0.38 && state.street !== 'river' && Math.random() < equity * 0.45) {
      return { type: 'raise', amount: raiseSize(state, me, equity * 0.85) };
    }
    // Steal in late position preflop
    if (state.street === 'preflop' && pos > 1.0 && equity >= 0.28 && Math.random() < 0.35) {
      return { type: 'raise', amount: raiseSize(state, me, 0.45) };
    }
    return { type: 'check' };
  }

  // Facing a bet
  const edge = equity - odds;

  // Strong value — raise for value
  if (equity >= 0.68 || (equity >= 0.55 && edge > 0.12)) {
    if (me.chips > callAmt && (spr < 3 || equity > 0.75)) {
      // Commit with monsters / short SPR
      if (equity >= 0.8 || (committed && equity >= 0.55)) {
        return { type: 'raise', amount: me.chips }; // shove
      }
      return { type: 'raise', amount: raiseSize(state, me, equity) };
    }
    return callAmt >= me.chips ? { type: 'call' } : { type: 'call' };
  }

  // +EV call
  if (edge > 0.02 || (edge > -0.03 && equity >= 0.42 && state.street !== 'river')) {
    // Occasional raise as bluff-raise with fair equity
    if (
      equity >= 0.45 &&
      me.chips > callAmt * 2 &&
      state.street !== 'preflop' &&
      Math.random() < 0.18
    ) {
      return { type: 'raise', amount: raiseSize(state, me, equity) };
    }
    return { type: 'call' };
  }

  // Pot-committed defense
  if (committed && equity >= 0.28) {
    return { type: 'call' };
  }

  // Cheap call with live equity (set mining / implied odds preflop)
  if (
    state.street === 'preflop' &&
    callAmt <= state.bigBlind * 3 &&
    equity >= 0.32 &&
    me.chips > callAmt * 8
  ) {
    return { type: 'call' };
  }

  // River: bluff-catch only with decent showdown value
  if (state.street === 'river' && equity >= 0.4 && edge > -0.08) {
    return { type: 'call' };
  }

  return { type: 'fold' };
}
