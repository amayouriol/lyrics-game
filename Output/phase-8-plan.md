# Plan: Phase 8 — Sing mode
Date: 2026-10-09
Derived from: Output/phase-8-spec.md (including the step 0 results). Replaces plan.md's Phase 8 section. Review before building.

Order: the rules first (which lines are hidden, how heard words match, scoring), checked by `npm test` before any screen uses them. Then the listening on its own, then the song screen, the play screen, results, and progress last.

## Technical decisions (for you to approve)
- **No new packages.** Listening uses the browser's own speech recognition (Chrome and Edge have it), as in step 0. Your voice goes to the browser's online speech service; the app only ever sees the words.
- **The song's language picks what the app listens for:** the language the library already works out from the lyrics (English or Spanish). Spanish listens with the Latin America setting (it did best in step 0). Shown as a quiet note, not a switch (approved 2026-10-09, see spec item 3b). Your correction is remembered per song in the browser.
- **Sing rules go in a new file next to the game rules** (`src/lib/sing.ts`), pure like `game.ts`, so they're checked by `npm test`: which lines are hidden per level, matching what was heard to the lines (with the ±1 second rule and near-misses), and the score.
- **"Near-miss" means:** after the usual forgiving comparison (case, accents, apostrophes), a heard word matches if it differs by one letter at the end ("parque" / "parques"), or two heard words joined make the lyric word ("amando" + "te" = "amandote"). Nothing looser: "and dear" for "endear" stays a miss, so mumbling can't score.
- **Sung games are saved in the same file as typed ones** (`.data/games.json`) with a new `mode: "sing"`. Older games have no mode and count as typed, so nothing needs converting. Each sung line is saved as its words, each word "right" or "revealed", so "words heard" and "accuracy" work the same as typing.
- **Best streak in Sing mode** counts full lines (every word heard) in a row, as the spec says. Saved games keep which line each word belongs to so the server can recount it.
- **Type or Sing travels in the address** like the level does (`…/play?level=medium&mode=sing`), so refresh and "Play again" keep it. The last choice is remembered in the browser for the next song.
- **The test page from step 0** (`src/app/lab/`, not committed) is reused as a starting point for the listening code, then deleted in step 7.

## 1. Sing rules (`src/lib/sing.ts`) and their checks
- [x] Hidden lines per level: Easy every other line with words, Medium and Hard every line with words. Lines with no words (instrumental gaps) are never hidden.
- [x] Matching heard words to lines: a word counts for the line it was heard in, or the one starting within 1 s after / ended within 1 s before, if that line still needs it. Each lyric word once; out of order is fine.
- [x] Near-misses as above.
- [x] Score: 100 / 150 / 200 per word heard; accuracy = words heard out of words hidden; best streak = full lines in a row.
- [x] `npm test` checks for each rule, using the real misses from step 0 ("parque", "amando te", the first word of a line sung early, "and dear" not counting, silence scoring 0).
- Done 2026-10-09: `src/lib/sing.ts` (`singLines`, `matchSung`, `singStats`, `isLineOver`) and 14 checks in `sing.test.ts` (34 in all with the game's). Near-miss is one letter more or less at the end, for words of 3+ letters; two words heard within 1.5 s can join. Lint, tests and build pass.

## 2. Listening (`useListening`)
- [x] Starts and stops with the song; pauses with Pause.
- [x] Restarts by itself when the browser stops (step 0: every ~8 s of silence, and mid-song). If it can't restart, a red light with "Not listening — tap to retry", and the time it was off is remembered for the results.
- [x] Reports each word with when in the song it was heard, and whether sound is coming in (for the pulsing light).
- [x] Says clearly when the browser can't do speech, or when the microphone is missing or refused.
- Done 2026-10-09: `play/speech.ts` (the browser's recognition, microphone checks, which language setting per song language) and `play/useListening.ts` (listens while the song plays, restarts by itself, gives up after 5 quick failures in a row, adds up time not listening). Tried on the step 0 test page with your voice: Shakira on Medium, with a pause and 20 s of silence, 0.0 s not listening; microphone blocked reported as "denied" with the music still playing. Lint, tests and build pass.

## 3. Song screen: Type or Sing
- [x] **Type / Sing** choice above the levels; Type by default, last choice remembered.
- [x] With Sing: the level descriptions change to the Sing ones; the count reads "12 lines to sing" instead of blanks.
- [x] The quiet language note (spec 3b): "Listens for Spanish words · Change" with a "?" that explains it; "Will you sing in English or Spanish?" when the language is unknown; a correction remembered for that song.
- [x] First time: the headphones note (including that your voice is turned into words by an online service), then the browser's microphone prompt. Not shown again once allowed.
- [x] Microphone refused → "Sing mode needs your microphone." with how to allow it. Browser without speech → Sing greyed out with "Sing mode doesn't work in this browser." Type untouched in both.
- Done 2026-10-10: "How you play: Type | Sing" on the song screen (`SongClient.tsx`), choices kept in the browser (`singPrefs.ts`: mode, headphones note seen, language per song). The lyrics service now sends each song's language. Checked by you in your browser: Sing texts, the language note with Change and ?, the headphones panel, choices remembered after reload. Lint, tests and build pass.

## 4. Play screen in Sing mode
- [ ] Same screen as Type: lyrics scroll and glide, current line lit. Lines that aren't hidden show as normal.
- [ ] Hidden lines: one empty slot per word (Easy, Medium), filling in as heard. On Hard, no slots; heard words appear as they come.
- [ ] When a hidden line ends (plus the 1 s grace): missing words in red, the count "5 of 7".
- [ ] No waiting, no countdown, no typing box. Pause stops music and listening together.
- [ ] Microphone light: pulses with sound, red when not listening.
- [ ] Score and streak in the corner update as words fill in.

## 5. Results
- [ ] "Sing" next to the level; score, words heard of hidden, best streak of full lines, verdict.
- [ ] "Listening was off for part of this song" when it was.
- [ ] "Play again" (Sing, same level), "Try typing" (Type, same level), "Try Hard" etc. stays in Sing.
- [ ] Saved like typed games, with the mode; saving errors as in Phase 6.

## 6. Progress on home
- [ ] Recently played: a microphone mark on sung games (keyboard mark on typed ones only where both appear side by side, e.g. Best songs).
- [ ] Best songs: a song can appear once typed and once sung.
- [ ] Words you keep missing: typed games only.
- [ ] Overall stats: "Typed: 24 songs, 81%" and "Sung: 3 songs, 68%" when you have sung games; unchanged otherwise.
- [ ] "Play again" from home keeps the mode. The library's "played" filter counts sung games too.
- [ ] `npm test` checks for the progress rules (needs `progress.ts` to import `./game.ts` with its extension, as `game.test.ts` does).

## 7. Checks and tidy-up
- [ ] `npm run lint`, `npm test`, `npm run build` pass, and the GitHub check is green.
- [ ] Delete the step 0 test page (`src/app/lab/`, `src/app/api/lab/`) and `.data/sing-tests.json`.

## Acceptance check (tied to phase-8-spec.md's Success section)
- [ ] With headphones, one English and one Spanish song you know well, on Medium: at least 70% of the words
- [ ] Same song, silent: 0. Mumbling: under 10%
- [ ] Words you clearly sang fill their slot before the line ends or within a second
- [ ] On Hard, no slots show how many words a line has
- [ ] A sung game on home has the microphone; Best songs shows the song separately typed and sung; Words you keep missing doesn't change after a sung game
- [ ] Refusing the microphone leaves Type fully playable
- [ ] Type mode plays exactly as before

## Before approving this plan
- [x] The technical decisions above are fine with you (approved 2026-10-09; the language switch became a quiet note with a "?")
- [x] Nothing from the spec is missing, and nothing from V2 crept in
