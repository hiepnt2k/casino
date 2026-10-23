# Casino

Web casino with Texas Hold'em and Blackjack. Built with Next.js and Tailwind CSS.

## Run

```bash
npm install
npm run dev
```

Open the URL Next prints (usually `http://localhost:3000`).

## Features

- 6-max No-Limit Hold'em (starting stack 5000, blinds 25/50)
- Full streets: preflop → flop → turn → river → showdown
- Side pots and all-in runouts
- AI uses Monte Carlo equity, pot odds, position, and tight-aggressive strategy
- Showdown popup shows the winning hand and its best five cards

## Controls

- **Deal / Next Hand** — start a hand
- **Fold / Check / Call / Raise / All-in** — your actions
- Raise slider sets bet size
