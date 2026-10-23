import type { ActionResult, Card, GameState, Player, Street } from './types';
import { BOT_NAMES } from './types';
import { createDeck } from './deck';
import { evaluateHand } from './handEvaluator';

const STARTING_CHIPS = 5000;
const SMALL_BLIND = 25;
const BIG_BLIND = 50;

function nextOccupied(players: Player[], from: number, pred?: (p: Player) => boolean): number {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n;
    const p = players[idx];
    if (p.chips > 0 || p.betThisStreet > 0) {
      if (!pred || pred(p)) return idx;
    }
  }
  return from;
}

function nextToAct(players: Player[], from: number): number {
  return nextOccupied(players, from, (p) => !p.isFolded && !p.isAllIn && p.chips > 0);
}

function canStillAct(players: Player[]): Player[] {
  return players.filter((p) => !p.isFolded && !p.isAllIn && p.chips > 0);
}

function bettingComplete(state: GameState): boolean {
  const active = canStillAct(state.players);
  if (active.length === 0) return true;
  // All active players have matched current bet and acted (or checked around)
  return active.every(
    (p) => p.hasActed && p.betThisStreet === state.currentBet,
  );
}

function onlyOneLeft(players: Player[]): boolean {
  return players.filter((p) => !p.isFolded).length <= 1;
}

export function createInitialState(): GameState {
  const players: Player[] = [
    {
      id: 0,
      name: 'You',
      chips: STARTING_CHIPS,
      holeCards: [],
      isHuman: true,
      isFolded: false,
      isAllIn: false,
      betThisStreet: 0,
      totalBet: 0,
      hasActed: false,
    },
    ...BOT_NAMES.map((name, i) => ({
      id: i + 1,
      name,
      chips: STARTING_CHIPS,
      holeCards: [] as Card[],
      isHuman: false,
      isFolded: false,
      isAllIn: false,
      betThisStreet: 0,
      totalBet: 0,
      hasActed: false,
    })),
  ];

  return {
    players,
    communityCards: [],
    deck: [],
    pot: 0,
    sidePots: [],
    street: 'preflop',
    dealerIndex: 0,
    currentPlayerIndex: 0,
    currentBet: 0,
    minRaise: BIG_BLIND,
    smallBlind: SMALL_BLIND,
    bigBlind: BIG_BLIND,
    handNumber: 0,
    winners: [],
    lastAction: 'Welcome to Texas Hold\'em. Press Deal to start.',
    isHandOver: true,
    waitingForHuman: false,
  };
}

function resetPlayerForHand(p: Player): Player {
  return {
    ...p,
    holeCards: [],
    isFolded: p.chips <= 0,
    isAllIn: false,
    betThisStreet: 0,
    totalBet: 0,
    hasActed: false,
  };
}

export function startNewHand(prev: GameState): GameState {
  const withChips = prev.players.filter((p) => p.chips > 0);
  if (withChips.length < 2) {
    return {
      ...prev,
      lastAction: 'Game over — not enough players with chips.',
      isHandOver: true,
      waitingForHuman: false,
    };
  }

  let dealerIndex = nextOccupied(prev.players, prev.dealerIndex, (p) => p.chips > 0);
  // If first hand, keep rotating from previous
  if (prev.handNumber === 0) {
    dealerIndex = prev.players.findIndex((p) => p.chips > 0);
  }

  let players = prev.players.map(resetPlayerForHand);
  let deck = createDeck();

  // Deal 2 hole cards each
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < players.length; i++) {
      const idx = (dealerIndex + 1 + i) % players.length;
      if (players[idx].chips > 0 && !players[idx].isFolded) {
        players[idx] = {
          ...players[idx],
          holeCards: [...players[idx].holeCards, deck[0]],
        };
        deck = deck.slice(1);
      }
    }
  }

  const sbIdx = nextOccupied(players, dealerIndex, (p) => p.chips > 0 && !p.isFolded);
  const bbIdx = nextOccupied(players, sbIdx, (p) => p.chips > 0 && !p.isFolded);

  let pot = 0;
  const postBlind = (idx: number, amount: number) => {
    const pay = Math.min(amount, players[idx].chips);
    players[idx] = {
      ...players[idx],
      chips: players[idx].chips - pay,
      betThisStreet: pay,
      totalBet: pay,
      isAllIn: players[idx].chips - pay === 0,
    };
    pot += pay;
  };

  postBlind(sbIdx, prev.smallBlind);
  postBlind(bbIdx, prev.bigBlind);

  const currentBet = Math.max(
    players[sbIdx].betThisStreet,
    players[bbIdx].betThisStreet,
  );

  // First to act preflop: left of BB
  let currentPlayerIndex = nextToAct(players, bbIdx);

  const state: GameState = {
    ...prev,
    players,
    communityCards: [],
    deck,
    pot,
    sidePots: [],
    street: 'preflop',
    dealerIndex,
    currentPlayerIndex,
    currentBet,
    minRaise: prev.bigBlind,
    handNumber: prev.handNumber + 1,
    winners: [],
    lastAction: `Hand #${prev.handNumber + 1} — blinds posted.`,
    isHandOver: false,
    waitingForHuman: false,
  };

  // If everyone all-in after blinds somehow
  if (bettingComplete(state) || onlyOneLeft(players)) {
    return advanceStreet(state);
  }

  const cur = state.players[state.currentPlayerIndex];
  return {
    ...state,
    waitingForHuman: cur.isHuman,
    lastAction: cur.isHuman
      ? 'Your turn.'
      : `${cur.name} is thinking...`,
  };
}

export function applyAction(state: GameState, action: ActionResult): GameState {
  if (state.isHandOver) return state;
  const idx = state.currentPlayerIndex;
  let players = state.players.map((p) => ({ ...p }));
  const me = players[idx];
  if (me.isFolded || me.isAllIn) return state;

  let pot = state.pot;
  let currentBet = state.currentBet;
  let minRaise = state.minRaise;
  let lastAction = '';

  const putChips = (amount: number) => {
    const pay = Math.min(amount, me.chips);
    me.chips -= pay;
    me.betThisStreet += pay;
    me.totalBet += pay;
    pot += pay;
    if (me.chips === 0) me.isAllIn = true;
    return pay;
  };

  switch (action.type) {
    case 'fold':
      me.isFolded = true;
      lastAction = `${me.name} folds.`;
      break;
    case 'check':
      if (currentBet !== me.betThisStreet) {
        // Illegal — treat as call
        const call = currentBet - me.betThisStreet;
        putChips(call);
        lastAction = `${me.name} calls ${call}.`;
      } else {
        lastAction = `${me.name} checks.`;
      }
      break;
    case 'call': {
      const call = currentBet - me.betThisStreet;
      const paid = putChips(call);
      lastAction = me.isAllIn
        ? `${me.name} calls all-in (${paid}).`
        : `${me.name} calls ${paid}.`;
      break;
    }
    case 'bet':
    case 'raise':
    case 'all-in': {
      let totalWanted = action.amount ?? me.chips;
      // amount is chips to put in this action (additional)
      if (action.type === 'all-in') totalWanted = me.chips;

      const additional = Math.min(totalWanted, me.chips);
      const prevBet = me.betThisStreet;
      putChips(additional);
      const raiseBy = me.betThisStreet - currentBet;

      if (me.betThisStreet > currentBet) {
        const isFullRaise = raiseBy >= minRaise;
        currentBet = me.betThisStreet;
        if (isFullRaise) {
          minRaise = Math.max(minRaise, raiseBy);
          // Full raise re-opens action
          players = players.map((p, i) =>
            i === idx || p.isFolded || p.isAllIn
              ? p
              : { ...p, hasActed: false },
          );
          players[idx] = me;
        }
        // Short all-in raises the call amount but does not reopen
        lastAction = me.isAllIn
          ? `${me.name} shoves all-in (${me.betThisStreet})!`
          : `${me.name} raises to ${me.betThisStreet}.`;
      } else {
        lastAction = `${me.name} calls ${me.betThisStreet - prevBet}.`;
      }
      break;
    }
  }

  me.hasActed = true;
  players[idx] = me;

  let next: GameState = {
    ...state,
    players,
    pot,
    currentBet,
    minRaise,
    lastAction,
    waitingForHuman: false,
  };

  if (onlyOneLeft(players)) {
    return awardPotToLastPlayer(next);
  }

  if (bettingComplete(next)) {
    return advanceStreet(next);
  }

  const nextIdx = nextToAct(players, idx);
  const nextPlayer = players[nextIdx];
  return {
    ...next,
    currentPlayerIndex: nextIdx,
    waitingForHuman: nextPlayer.isHuman,
    lastAction: nextPlayer.isHuman
      ? `${lastAction} Your turn.`
      : `${lastAction} ${nextPlayer.name} is thinking...`,
  };
}

function resetStreetBets(players: Player[]): Player[] {
  return players.map((p) => ({
    ...p,
    betThisStreet: 0,
    hasActed: false,
  }));
}

function dealCommunity(state: GameState, count: number): { cards: Card[]; deck: Card[] } {
  let deck = [...state.deck];
  // Burn one
  deck = deck.slice(1);
  const cards = deck.slice(0, count);
  deck = deck.slice(count);
  return { cards: [...state.communityCards, ...cards], deck };
}

function advanceStreet(state: GameState): GameState {
  const alive = state.players.filter((p) => !p.isFolded);
  if (alive.length <= 1) return awardPotToLastPlayer(state);

  const stillToAct = canStillAct(state.players);
  let street: Street = state.street;
  let communityCards = state.communityCards;
  let deck = state.deck;

  const goShowdown = stillToAct.length <= 1 && communityCards.length < 5;

  if (state.street === 'preflop') {
    street = 'flop';
    const dealt = dealCommunity({ ...state, deck }, 3);
    communityCards = dealt.cards;
    deck = dealt.deck;
  } else if (state.street === 'flop') {
    street = 'turn';
    const dealt = dealCommunity({ ...state, deck }, 1);
    communityCards = dealt.cards;
    deck = dealt.deck;
  } else if (state.street === 'turn') {
    street = 'river';
    const dealt = dealCommunity({ ...state, deck }, 1);
    communityCards = dealt.cards;
    deck = dealt.deck;
  } else if (state.street === 'river') {
    return showdown(state);
  }

  // Run out board if everyone all-in
  let next: GameState = {
    ...state,
    street,
    communityCards,
    deck,
    currentBet: 0,
    minRaise: state.bigBlind,
    players: resetStreetBets(state.players),
  };

  while (
    canStillAct(next.players).length <= 1 &&
    next.communityCards.length < 5 &&
    !onlyOneLeft(next.players)
  ) {
    if (next.street === 'flop') {
      const d = dealCommunity(next, 1);
      next = { ...next, street: 'turn', communityCards: d.cards, deck: d.deck };
    } else if (next.street === 'turn') {
      const d = dealCommunity(next, 1);
      next = { ...next, street: 'river', communityCards: d.cards, deck: d.deck };
    } else if (next.street === 'preflop') {
      const d = dealCommunity(next, 3);
      next = { ...next, street: 'flop', communityCards: d.cards, deck: d.deck };
    } else break;
  }

  if (
    next.communityCards.length === 5 &&
    (canStillAct(next.players).length <= 1 || goShowdown || next.street === 'river')
  ) {
    // If we ran out the board due to all-in, showdown
    if (canStillAct(next.players).length <= 1) {
      return showdown({ ...next, street: 'river' });
    }
  }

  if (next.street === 'river' && canStillAct(next.players).length <= 1) {
    return showdown(next);
  }

  // First to act: left of dealer
  const first = nextToAct(next.players, next.dealerIndex);
  const cur = next.players[first];

  if (canStillAct(next.players).length === 0) {
    return showdown({ ...next, street: 'river' });
  }

  return {
    ...next,
    currentPlayerIndex: first,
    waitingForHuman: cur.isHuman,
    lastAction: `${streetLabel(street)} dealt. ${cur.isHuman ? 'Your turn.' : cur.name + ' is thinking...'}`,
  };
}

function streetLabel(s: Street): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function awardPotToLastPlayer(state: GameState): GameState {
  const winner = state.players.find((p) => !p.isFolded);
  if (!winner) return { ...state, isHandOver: true };

  const players = state.players.map((p) =>
    p.id === winner.id ? { ...p, chips: p.chips + state.pot } : p,
  );

  return {
    ...state,
    players,
    pot: 0,
    winners: [{ playerId: winner.id, amount: state.pot }],
    lastAction: `${winner.name} wins ${state.pot} (everyone folded).`,
    isHandOver: true,
    waitingForHuman: false,
    street: 'showdown',
  };
}

function showdown(state: GameState): GameState {
  const contenders = state.players.filter((p) => !p.isFolded);
  const evaluated = contenders.map((p) => ({
    player: p,
    hand: evaluateHand([...p.holeCards, ...state.communityCards]),
  }));

  // Simple pot: all chips already in pot; handle side pots by contribution
  const contributions = state.players.map((p) => ({ id: p.id, paid: p.totalBet }));
  const levels = [...new Set(contributions.map((c) => c.paid).filter((x) => x > 0))].sort(
    (a, b) => a - b,
  );

  let players = state.players.map((p) => ({ ...p }));
  const winners: GameState['winners'] = [];
  let remainingPotDesc = '';

  let prevLevel = 0;
  for (const level of levels) {
    const layerAmount = level - prevLevel;
    const eligibleIds = contributions.filter((c) => c.paid >= level).map((c) => c.id);
    // Each eligible player contributed `layerAmount` for this layer... but folded players
    // who paid also contribute. Count how many paid at least this level.
    const payers = contributions.filter((c) => c.paid >= level).length;
    const potLayer = layerAmount * payers;

    const eligibleEvals = evaluated.filter((e) => eligibleIds.includes(e.player.id));
    if (eligibleEvals.length === 0 || potLayer <= 0) {
      prevLevel = level;
      continue;
    }

    const bestScore = Math.max(...eligibleEvals.map((e) => e.hand.score));
    const layerWinners = eligibleEvals.filter((e) => e.hand.score === bestScore);
    const share = Math.floor(potLayer / layerWinners.length);
    let remainder = potLayer - share * layerWinners.length;

    for (const w of layerWinners) {
      const extra = remainder > 0 ? 1 : 0;
      remainder -= extra;
      const amount = share + extra;
      const pi = players.findIndex((p) => p.id === w.player.id);
      players[pi] = { ...players[pi], chips: players[pi].chips + amount };
      const existing = winners.find((x) => x.playerId === w.player.id);
      if (existing) existing.amount += amount;
      else
        winners.push({
          playerId: w.player.id,
          amount,
          handName: w.hand.name,
          cards: w.hand.cards,
        });
    }
    prevLevel = level;
  }

  // Any chips that weren't distributed (rounding) — shouldn't happen often
  const distributed = winners.reduce((s, w) => s + w.amount, 0);
  if (distributed < state.pot && winners.length > 0) {
    const pi = players.findIndex((p) => p.id === winners[0].playerId);
    players[pi] = { ...players[pi], chips: players[pi].chips + (state.pot - distributed) };
    winners[0].amount += state.pot - distributed;
  }

  const winnerText = winners
    .map((w) => {
      const name = players.find((p) => p.id === w.playerId)?.name;
      return `${name} wins ${w.amount}${w.handName ? ` with ${w.handName}` : ''}`;
    })
    .join('; ');

  remainingPotDesc = winnerText;

  return {
    ...state,
    players,
    pot: 0,
    winners,
    lastAction: `Showdown — ${remainingPotDesc}.`,
    isHandOver: true,
    waitingForHuman: false,
    street: 'showdown',
  };
}

export function getCallAmount(state: GameState): number {
  const me = state.players[state.currentPlayerIndex];
  return Math.min(state.currentBet - me.betThisStreet, me.chips);
}

export function getMinRaiseTotal(state: GameState): number {
  const me = state.players[state.currentPlayerIndex];
  return state.currentBet + state.minRaise - me.betThisStreet;
}

export function humanCanCheck(state: GameState): boolean {
  const me = state.players[state.currentPlayerIndex];
  return me.isHuman && state.currentBet === me.betThisStreet;
}
