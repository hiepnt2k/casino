import type { Card, Rank, Suit } from './types';

const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return shuffle(deck);
}

export function shuffle(deck: Card[]): Card[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function cardKey(card: Card): string {
  return `${card.rank}${card.suit[0]}`;
}

export function cardsEqual(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

export function removeCards(deck: Card[], cards: Card[]): Card[] {
  return deck.filter((c) => !cards.some((x) => cardsEqual(c, x)));
}

export function formatCard(card: Card): string {
  return `${card.rank}${card.suit[0].toUpperCase()}`;
}
