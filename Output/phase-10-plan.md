# Plan: Phase 10 — Lyric Drop look for the song screen
Date: 2026-10-10
Derived from: Output/phase-10-spec.md. Review before building.

## Technical decisions (for you to approve)
- **No new packages, no rule changes.** The six level texts live next to the game rules (`game.ts`, `sing.ts`), replacing the current descriptions, so the song screen and the rules can't disagree. The How to play page keeps its own wording.
- **Rebuilt in place:** `SongClient.tsx` and `song.module.css`, from the Figma `GameSetupScreen` styles. The heart and bookmark get a round "large" look on this screen.
- **The cover** is the real Spotify cover with nothing on it; the design's generated cover only for songs without one.

## 1. The song screen in the new look
- [ ] Cover, titles, How you play, Difficulty with points, level text with real counts, language note with "Why choose a language?", start button, heart and bookmark.
- [ ] Microphone, loading, no lyrics and error states restyled, same behavior.

## 2. Checks and play-test
- [ ] `npm run lint`, `npm test`, `npm run build` pass; GitHub check passes.
- [ ] Your play-test: both modes, all three levels, Change and "?", start a song, heart and bookmark.
- [ ] plan.md gets a Phase 10 section; close with `Close Phase 10: …` after your play-test.
