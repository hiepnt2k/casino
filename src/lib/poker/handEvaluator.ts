import type { Card, Rank } from './types';
import { RANK_VALUES } from './types';

export interface HandRank {
  /** Higher = better. Category * 1e10 + kickers */
  score: number;
  name: string;
  category: number;
  /** The five cards that make this hand, strongest groups first. */
  cards: Card[];
}

const CATEGORY = {
  HIGH_CARD: 0,
  PAIR: 1,
  TWO_PAIR: 2,
  THREE_OF_KIND: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  FOUR_OF_KIND: 7,
  STRAIGHT_FLUSH: 8,
} as const;

const CATEGORY_NAMES: Record<number, string> = {
  0: 'High Card',
  1: 'Pair',
  2: 'Two Pair',
  3: 'Three of a Kind',
  4: 'Straight',
  5: 'Flush',
  6: 'Full House',
  7: 'Four of a Kind',
  8: 'Straight Flush',
};

function rankVal(r: Rank): number {
  return RANK_VALUES[r];
}

function combinations(cards: Card[], k: number): Card[][] {
  if (k === 0) return [[]];
  if (cards.length < k) return [];
  const [first, ...rest] = cards;
  const withFirst = combinations(rest, k - 1).map((c) => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function evaluateFive(cards: Card[]): HandRank {
  const vals = cards.map((c) => rankVal(c.rank)).sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);

  const counts = new Map<number, number>();
  for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);

  const groups = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  // Straight (incl. wheel A-2-3-4-5)
  const unique = [...new Set(vals)].sort((a, b) => b - a);
  let straightHigh = 0;
  if (unique.length === 5) {
    if (unique[0] - unique[4] === 4) {
      straightHigh = unique[0];
    } else if (
      unique[0] === 14 &&
      unique[1] === 5 &&
      unique[2] === 4 &&
      unique[3] === 3 &&
      unique[4] === 2
    ) {
      straightHigh = 5;
    }
  }

  const isStraight = straightHigh > 0;

  let category: number;
  let kickers: number[];

  if (isStraight && isFlush) {
    category = CATEGORY.STRAIGHT_FLUSH;
    kickers = [straightHigh];
  } else if (groups[0][1] === 4) {
    category = CATEGORY.FOUR_OF_KIND;
    kickers = [groups[0][0], groups[1][0]];
  } else if (groups[0][1] === 3 && groups[1][1] === 2) {
    category = CATEGORY.FULL_HOUSE;
    kickers = [groups[0][0], groups[1][0]];
  } else if (isFlush) {
    category = CATEGORY.FLUSH;
    kickers = vals;
  } else if (isStraight) {
    category = CATEGORY.STRAIGHT;
    kickers = [straightHigh];
  } else if (groups[0][1] === 3) {
    category = CATEGORY.THREE_OF_KIND;
    kickers = [groups[0][0], ...groups.slice(1).map((g) => g[0])];
  } else if (groups[0][1] === 2 && groups[1][1] === 2) {
    category = CATEGORY.TWO_PAIR;
    const pairs = [groups[0][0], groups[1][0]].sort((a, b) => b - a);
    kickers = [...pairs, groups[2][0]];
  } else if (groups[0][1] === 2) {
    category = CATEGORY.PAIR;
    kickers = [groups[0][0], ...groups.slice(1).map((g) => g[0])];
  } else {
    category = CATEGORY.HIGH_CARD;
    kickers = vals;
  }

  let score = category * 1e10;
  for (let i = 0; i < kickers.length; i++) {
    score += kickers[i] * Math.pow(15, 4 - i);
  }

  return { score, name: CATEGORY_NAMES[category], category, cards: orderForDisplay(cards) };
}

function orderForDisplay(cards: Card[]): Card[] {
  const counts = new Map<number, number>();
  for (const card of cards) {
    const value = rankVal(card.rank);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...cards].sort((a, b) => {
    const valueA = rankVal(a.rank);
    const valueB = rankVal(b.rank);
    const countA = counts.get(valueA) ?? 0;
    const countB = counts.get(valueB) ?? 0;
    if (countB !== countA) return countB - countA;
    return valueB - valueA;
  });
}

/** Best 5-card hand from 5–7 cards */
export function evaluateHand(cards: Card[]): HandRank {
  if (cards.length < 5) {
    return { score: 0, name: 'Incomplete', category: -1, cards: [] };
  }
  if (cards.length === 5) return evaluateFive(cards);

  let best: HandRank = { score: -1, name: '', category: -1, cards: [] };
  for (const combo of combinations(cards, 5)) {
    const rank = evaluateFive(combo);
    if (rank.score > best.score) best = rank;
  }
  return best;
}

export function compareHands(a: Card[], b: Card[]): number {
  return evaluateHand(a).score - evaluateHand(b).score;
}

/** Rough hand strength 0–1 for AI preflop heuristics */
export function preflopStrength(hole: Card[]): number {
  if (hole.length !== 2) return 0;
  const [c1, c2] = hole;
  const v1 = rankVal(c1.rank);
  const v2 = rankVal(c2.rank);
  const high = Math.max(v1, v2);
  const low = Math.min(v1, v2);
  const suited = c1.suit === c2.suit;
  const paired = v1 === v2;
  const gap = high - low;

  if (paired) {
    // Pair strength: 22 ~0.5, AA ~1.0
    return 0.5 + (high - 2) * (0.5 / 12);
  }

  let s = (high - 2) / 12 * 0.45 + (low - 2) / 12 * 0.15;
  if (suited) s += 0.08;
  if (gap === 1) s += 0.05;
  else if (gap === 2) s += 0.03;
  else if (gap >= 5) s -= 0.06;
  if (high === 14) s += 0.1; // Ace high bonus
  return Math.max(0.05, Math.min(0.95, s));
}
