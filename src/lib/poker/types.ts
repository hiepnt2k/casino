export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank =
  | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type PlayerAction = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

export interface Player {
  id: number;
  name: string;
  chips: number;
  holeCards: Card[];
  isHuman: boolean;
  isFolded: boolean;
  isAllIn: boolean;
  betThisStreet: number;
  totalBet: number;
  hasActed: boolean;
}

export interface ActionResult {
  type: PlayerAction;
  amount?: number;
}

export interface GameState {
  players: Player[];
  communityCards: Card[];
  deck: Card[];
  pot: number;
  sidePots: { amount: number; eligible: number[] }[];
  street: Street;
  dealerIndex: number;
  currentPlayerIndex: number;
  currentBet: number;
  minRaise: number;
  smallBlind: number;
  bigBlind: number;
  handNumber: number;
  winners: { playerId: number; amount: number; handName?: string; cards?: Card[] }[];
  lastAction: string;
  isHandOver: boolean;
  waitingForHuman: boolean;
}

export const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export const BOT_NAMES = ['AceBot', 'BluffKing', 'IceQueen', 'SharkAI', 'ProMax'];
