import type { Metadata } from 'next';
import { Cormorant_Garamond, Manrope } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-cormorant',
});

export const metadata: Metadata = {
  title: {
    default: 'Casino',
    template: '%s · Casino',
  },
  description: 'Choose a game to play.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} ${display.variable} h-full`}>
      <body className="h-dvh overflow-hidden bg-[#07080b] font-sans text-[#f6f1e7] antialiased">
        {children}
      </body>
    </html>
  );
}
