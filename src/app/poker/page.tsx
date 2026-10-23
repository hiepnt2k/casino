import type { Metadata } from 'next';
import { GameTable } from '@/components/poker/GameTable';

export const metadata: Metadata = {
  title: "Poker Arena — Texas Hold'em",
  description: 'No-Limit Hold’em against five elite AI bots.',
};

export default function PokerPage() {
  return <GameTable />;
}
