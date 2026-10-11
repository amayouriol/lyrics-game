# Plan: Phase 11 — Lyric Drop look for the game and results screens
Date: 2026-10-10
Derived from: Output/phase-11-spec.md. Review before building.

## Technical decisions (for you to approve)
- **No new packages, no rule changes.** Only looks and layout: `play.module.css`, `PlayerBar`, `LyricBlank` and the screen markup in `PlayClient.tsx` and `SingScreen.tsx`.
- **The player bar** is shared by Type and Sing, so it changes once for both.
- **The stat tiles on results** replace the old `StatBlock` there with the home page's tile style.

## 1. Game screen, Type
- [x] Dark page; top row with Quit, points and streak only; lyrics; blanks and countdown; instructions with "Line N of M"; panels.
- [x] Bigger player bar (shared with Sing).
- Done 2026-10-10: `play.module.css` game section rewritten (dark stage, tiles, lyrics in DM Sans bold, help and line count under the lyrics, dark panels, violet countdown turning red); `PlayClient.tsx` top row with only points and streak; `LyricBlank.module.css` colors that work on dark and light; `PlayerBar` 88 px with a 52 px violet button and drawn play / pause icons. Approved by you. Lint, tests and build pass.

## 2. Game screen, Sing
- [x] Same layout; slots, line counts, microphone light with the instructions.
- Done 2026-10-10: `SingScreen.tsx` top row with only points and "line streak" (full lines in a row); the microphone light moved under the lyrics with the instructions and "Line N of M"; dark panels; `play.module.css` Sing section (line count tile, violet / red microphone light). Approved by you. Lint, tests and build pass.

## 3. Results, Type and Sing
- [x] Verdict, four tiles, buttons, save error; Your guesses (Type) and your lines (Sing).
- Done 2026-10-10: shared `ResultParts.tsx` (verdict with its last sentence in violet, result tile, Play again button); `PlayClient.tsx` and `SingScreen.tsx` results use them; `play.module.css` results section (dark top, light guesses below); each sung line shows its count; the "couldn't load this song" screen matches; the unused `StatBlock` removed. Approved by you. Lint, tests and build pass.

## 4. Checks and play-test
- [ ] `npm run lint`, `npm test`, `npm run build` pass; GitHub check passes.
- [ ] Your play-test: a Type song and a Sing song to the end, pause, Play again, Try next.
- [ ] plan.md gets a Phase 11 section; close with `Close Phase 11: …` after your play-test.
