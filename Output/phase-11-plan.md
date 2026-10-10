# Plan: Phase 11 — Lyric Drop look for the game and results screens
Date: 2026-10-10
Derived from: Output/phase-11-spec.md. Review before building.

## Technical decisions (for you to approve)
- **No new packages, no rule changes.** Only looks and layout: `play.module.css`, `PlayerBar`, `LyricBlank` and the screen markup in `PlayClient.tsx` and `SingScreen.tsx`.
- **The player bar** is shared by Type and Sing, so it changes once for both.
- **The stat tiles on results** replace the old `StatBlock` there with the home page's tile style.

## 1. Game screen, Type
- [ ] Dark page; top row with Quit, points and streak only; lyrics; blanks and countdown; instructions with "Line N of M"; panels.
- [ ] Bigger player bar (shared with Sing).

## 2. Game screen, Sing
- [ ] Same layout; slots, line counts, microphone light with the instructions.

## 3. Results, Type and Sing
- [ ] Verdict, four tiles, buttons, save error; Your guesses (Type) and your lines (Sing).

## 4. Checks and play-test
- [ ] `npm run lint`, `npm test`, `npm run build` pass; GitHub check passes.
- [ ] Your play-test: a Type song and a Sing song to the end, pause, Play again, Try next.
- [ ] plan.md gets a Phase 11 section; close with `Close Phase 11: …` after your play-test.
