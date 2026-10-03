# Plan: Phase 4 — The Game
Date: 2026-10-03
Derived from: Output/phase-4-spec.md. Replaces plan.md's Phase 4 section and takes the difficulty selector from its Phase 5.

## 1. Game rules (`src/lib/game.ts`, pure functions, used by browser and tests)
- [x] Difficulty table (Easy/Medium/Hard: labels, points, descriptions) and "next level up".
- [x] Split a lyric line into words, keeping punctuation attached (`"night,"` → word `night` + `,`), Unicode-aware for Spanish.
- [x] `normalize`: lower case, strip accents and ñ's tilde (Unicode decomposition), drop punctuation. Used for matching and filler-word checks.
- [x] Filler-word list, English (from the design) plus Spanish.
- [x] `pickBlanks(lines, level)`: per line Easy 1 on even lines / Medium 1 / Hard 2; eligible = 4+ letters, no digits, not filler; longest first, then leftmost. Deterministic.
- [x] Derive everything else from the answers and the current line (no stored "missed" flags): each blank's state (active / waiting / correct / wrong / revealed), score, streak, best streak, accuracy.
- [x] Verdict by accuracy (design copy).

## 2. Data
- [x] `/api/lyrics/[trackId]` returns `lines` (`timeMs` + `text`) instead of `lineTimesMs`. Lyrics text now reaches the browser, as decided in the Phase 4 spec ("hidden on screen only").

## 3. Song screen
- [x] Difficulty chips (design's selectable tertiary chips), Medium by default, description of the selected level, summary "N blanks · N lines · m:ss".
- [x] "Play the song" links to the play screen with `?level=`; disabled with "No words to guess at this level." when a level has no blanks.

## 4. Play screen
- [x] Top bar chips: difficulty, line, score, streak.
- [x] Previous line (small, answers filled in), current line (large, blanks), "· · ·" for the next line. Never the next line's text.
- [x] `LyricBlank` per the design: active (focused text box), waiting, correct, wrong (crossed-out guess + answer), revealed.
- [x] Check as you type; Enter on empty skips; Enter on a wrong guess shows the "Not it" message.
- [x] Help line: get-ready, default instructions, the latest event's message, or "Too slow. It was …" after a line with misses.
- [x] Paused (by you or by another device): lyrics hidden behind a pause message, no typing.
- [x] Song end → results; Quit → song screen, no results.

## 5. Results screen
- [x] Per the design: song chip, verdict, "You got X of Y words in Song.", four `StatBlock`s (Score, Accuracy, Best streak, Difficulty), Play again / Try {next level} / Pick another song, "Your guesses" list.
- [x] Play again and Try harder restart on the same page (reusing the page's one Spotify player) without reloading.

## 6. Checks
- [x] Unit-check `pickBlanks`, `normalize` and the scoring rules with a quick script (English and Spanish lines, accents, ñ, punctuation).
- [x] `npm run lint` and `npm run build` pass.

## Change after first play-test (2026-10-03): the song waits for your answer
- [x] `usePlayer` takes a hold point (`setHoldBeforeMs`): the next line's start, or 1.5s before the end on the last line, while the current line has an open word. It pauses 300ms early (Spotify stops with a short delay) and keeps its clock before the next line, so the line doesn't "move on" while waiting.
- [x] Released automatically when the word is right or skipped; resumes playback.
- [x] While waiting: lyrics stay visible (unlike a normal pause), play/pause disabled, help line "The song waits for you…".
- [x] A dropped playback during a wait clears the wait; after Resume, it waits again at the line end if the word is still open.

## Change after second play-test (2026-10-03): 3 tries per word, with a penalty
- [x] A try = a full-length (or longer) non-matching guess, counted automatically, or Enter on a shorter wrong guess.
- [x] Wrong try: box shakes and turns red (respects reduced-motion), clears, "Not “x”. N tries left."
- [x] 3rd wrong try: word missed (shown wrong with the last guess), streak reset, wait released so the song continues.
- [x] Points halve per wrong try (`pointsFor`); streak counts first-try words only; results' Score hint reads "Up to N per word".
- [x] 6 new rule checks (26 total) pass.

## Verified while building (2026-10-03)
- 20 rule checks pass: accent/ñ/case/apostrophe matching, punctuation kept outside words, blanks per level, filler skipped, deterministic picks, blank states, score/streak/accuracy, verdicts.
- On 4 real songs from the cache (Spanish and English), Medium hides sensible words ("corazón", "esperanza", "terminó", "somebody") and keeps trailing apostrophes outside the blank ("Tú [sabe]'").

## Acceptance check (tied to phase-4-spec.md's Success section)
- [ ] Each difficulty: number of blanks matches the song screen's summary
- [ ] Typing a hidden word (without accents on a Spanish song) turns it green and adds the level's points
- [x] With a word still open, the song pauses at the end of its line and continues by itself once it's answered; Enter on empty skips it (revealed, streak reset)
- [ ] A wrong guess shakes the box red and costs a try; after 3, the word is revealed and the song continues; a word right on try 2 scores half
- [ ] The next line's text never appears before the song reaches it
- [ ] Pausing hides the lyrics and blocks typing
- [ ] Results: score, accuracy, best streak and guess list match what happened
- [ ] Play again, Try harder and Pick another song work
- [ ] Quit mid-song returns to the song screen without results
