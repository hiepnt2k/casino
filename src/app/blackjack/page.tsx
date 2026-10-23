import type { Metadata } from 'next';
import { BlackjackTable } from '@/components/blackjack/BlackjackTable';

export const metadata: Metadata = {
  title: 'Blackjack',
  description: 'Blackjack against the dealer. Stands on 17, blackjack pays 3 to 2.',
};

export default function BlackjackPage() {
  return <BlackjackTable />;
}
