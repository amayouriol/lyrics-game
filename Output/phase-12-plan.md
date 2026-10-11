# Plan: Phase 12 — Fixes after play-testing
Date: 2026-10-11
Derived from: Output/phase-12-spec.md. Review before building.

## Technical decisions (for you to approve)
- **No new packages.** The level and repeat rules live in `pickBlanks` (`src/lib/game.ts`), with checks in `game.test.ts`.
- **Level texts** change in `game.ts` (song screen and results hint) and the How to play page's Type table.
- **The card and labels** are home page changes only (`HomeClient.tsx`, `home.module.css`).

## 1. Harder levels and fewer repeats (rules and checks)
- [ ] Easy two lines out of three, Medium two per line, Hard three (four on lines of 9+ words).
- [ ] A word isn't hidden twice in a song while the line has another word worth hiding; a repeat only when the line would get none, and not within 8 lines.
- [ ] Level texts on the song screen and How to play.
- [ ] `npm test`: counts per level, a chorus that repeats "love" asks its other words, a line with only used words gets a repeat after 8 lines.

## 2. Home tweaks
- [ ] Notes closer to the record.
- [ ] "in 1 song: <name>" / "in N songs" on the Words that keep dropping card.
- [ ] Bigger labels (and numbers) next to the totals.

## 3. Checks and play-test
- [ ] `npm run lint`, `npm test`, `npm run build` pass; GitHub check passes.
- [ ] Your play-test: a Type song on each level; the home page.
- [ ] plan.md gets a Phase 12 section; close with `Close Phase 12: …` after your play-test.
