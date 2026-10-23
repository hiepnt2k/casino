import type { Card } from '@/lib/poker/types';
import { createDeck, shuffle } from '@/lib/poker/deck';

export const STARTING_BANKROLL = 1000;

export type BjPhase = 'betting' | 'player' | 'dealer' | 'settled';
export type BjOutcome = 'blackjack' | 'win' | 'lose' | 'push' | 'bust' | null;

export interface BjState {
  shoe: Card[];
  player: Card[];
  dealer: Card[];
  bankroll: number;
  bet: number;
  phase: BjPhase;
  message: string;
  outcome: BjOutcome;
  /** Net chips added when the hand settles. Zero while the hand is in progress. */
  payout: number;
  dealerHoleHidden: boolean;
}

export function createBjState(): BjState {
  return {
    shoe: freshShoe(),
    player: [],
    dealer: [],
    bankroll: STARTING_BANKROLL,
    bet: 0,
    phase: 'betting',
    message: 'Place a bet to deal.',
    outcome: null,
    payout: 0,
    dealerHoleHidden: false,
  };
}

export function handTotal(cards: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.rank === 'A') {
      aces += 1;
      total += 11;
    } else if (card.rank === 'T' || card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') {
      total += 10;
    } else {
      total += Number(card.rank);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handTotal(cards) === 21;
}

export function dealHand(state: BjState, bet: number): BjState {
  if (state.phase !== 'betting') return state;
  const wager = Math.floor(bet);
  if (wager <= 0 || wager > state.bankroll) return state;

  let shoe = state.shoe.length < 52 ? freshShoe() : [...state.shoe];
  const draw = () => {
    const card = shoe[0];
    shoe = shoe.slice(1);
    return card;
  };

  const player = [draw(), draw()];
  const dealer = [draw(), draw()];
  const next: BjState = {
    ...state,
    shoe,
    player,
    dealer,
    bankroll: state.bankroll - wager,
    bet: wager,
    outcome: null,
    payout: 0,
    dealerHoleHidden: true,
    phase: 'player',
    message: 'Hit, stand, or double.',
  };

  if (isBlackjack(player) || isBlackjack(dealer)) {
    return settle({ ...next, dealerHoleHidden: false });
  }
  return next;
}

export function hit(state: BjState): BjState {
  if (state.phase !== 'player') return state;
  const { shoe, card } = drawOne(state.shoe);
  const player = [...state.player, card];
  const next = { ...state, shoe, player };
  if (handTotal(player) > 21) return settle(next);
  if (handTotal(player) === 21) return { ...next, phase: 'dealer', message: 'Dealer plays.' };
  return { ...next, message: `You have ${handTotal(player)}.` };
}

export function stand(state: BjState): BjState {
  if (state.phase !== 'player') return state;
  return { ...state, phase: 'dealer', message: 'Dealer plays.' };
}

export function doubleDown(state: BjState): BjState {
  if (state.phase !== 'player' || state.player.length !== 2 || state.bankroll < state.bet) return state;
  const { shoe, card } = drawOne(state.shoe);
  const next: BjState = {
    ...state,
    shoe,
    player: [...state.player, card],
    bankroll: state.bankroll - state.bet,
    bet: state.bet * 2,
    phase: 'dealer',
    message: 'Dealer plays.',
  };
  if (handTotal(next.player) > 21) return settle(next);
  return next;
}

/** Reveal the hole card, then draw until the dealer stands on 17. */
export function dealerStep(state: BjState): BjState {
  if (state.phase !== 'dealer') return state;
  if (state.dealerHoleHidden) {
    return { ...state, dealerHoleHidden: false, message: 'Dealer plays.' };
  }
  if (handTotal(state.dealer) < 17) {
    const { shoe, card } = drawOne(state.shoe);
    const dealer = [...state.dealer, card];
    const next = { ...state, shoe, dealer };
    if (handTotal(dealer) >= 17) return settle(next);
    return next;
  }
  return settle(state);
}

export function nextBet(state: BjState): BjState {
  if (state.phase !== 'settled') return state;
  return {
    ...state,
    player: [],
    dealer: [],
    bet: 0,
    phase: 'betting',
    outcome: null,
    payout: 0,
    dealerHoleHidden: false,
    message: state.bankroll > 0 ? 'Place a bet to deal.' : 'You are out of chips.',
  };
}

function settle(state: BjState): BjState {
  const playerTotal = handTotal(state.player);
  const dealerTotal = handTotal(state.dealer);
  const playerBj = isBlackjack(state.player);
  const dealerBj = isBlackjack(state.dealer);

  let outcome: BjOutcome;
  let payout = 0;
  let message: string;

  if (playerTotal > 21) {
    outcome = 'bust';
    message = `Bust. Dealer wins ${state.bet}.`;
  } else if (playerBj && dealerBj) {
    outcome = 'push';
    payout = state.bet;
    message = 'Both blackjack. Push.';
  } else if (playerBj) {
    outcome = 'blackjack';
    payout = state.bet + Math.floor(state.bet * 1.5);
    message = `Blackjack. You win ${payout - state.bet}.`;
  } else if (dealerTotal > 21) {
    outcome = 'win';
    payout = state.bet * 2;
    message = `Dealer busts. You win ${state.bet}.`;
  } else if (dealerBj || dealerTotal > playerTotal) {
    outcome = 'lose';
    message = dealerBj ? 'Dealer blackjack.' : `Dealer ${dealerTotal} beats ${playerTotal}.`;
  } else if (playerTotal > dealerTotal) {
    outcome = 'win';
    payout = state.bet * 2;
    message = `You win ${state.bet}.`;
  } else {
    outcome = 'push';
    payout = state.bet;
    message = `Push at ${playerTotal}.`;
  }

  return {
    ...state,
    dealerHoleHidden: false,
    phase: 'settled',
    outcome,
    payout,
    bankroll: state.bankroll + payout,
    message,
  };
}

function drawOne(shoe: Card[]): { shoe: Card[]; card: Card } {
  const source = shoe.length === 0 ? freshShoe() : shoe;
  return { card: source[0], shoe: source.slice(1) };
}

function freshShoe(): Card[] {
  return shuffle(Array.from({ length: 6 }, () => createDeck()).flat());
}
