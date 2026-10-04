# Plan: Phase 5 — Game Polish
Date: 2026-10-03
Derived from: Output/phase-5-spec.md. Replaces plan.md's original Phase 5 section (already built in Phases 2 and 4). Review before building.

Order: the rule change first (pure and easy to check), then the countdown (builds on the existing wait), then the motion (visual only), then the v1 sweep, which retests everything together.

## 1. Spaced-out hidden words (`src/lib/game.ts`)
- [x] `pickBlanks`: remember the last line each word (by `normalize`, so "Corazón" = "corazon") was hidden on. A candidate hidden fewer than 8 lines earlier is skipped. The next-longest eligible word is used instead, or no blank if none is left. Also on Hard: a line's two blanks are never the same word.
- [x] `SPACING_LINES = 8` as a named constant next to `MAX_TRIES`.
- [x] Still deterministic. Picking runs on the server per request (`/api/lyrics/[trackId]`) and isn't cached, so the song screen and play screen pick up the change together with nothing to clear.
- [x] Rule checks (throwaway script, as in Phase 4): a repeated chorus word comes back only after 8 lines; accent/capital variants count as one word; a line whose only word is spaced out gets no blank; Hard never doubles a word; the old checks still pass.
- [x] On the cached songs: how many Medium blanks remain, and whether any song now has no blanks at a level (that level shows "No words to guess at this level.", per the spec).
- Result (2026-10-03): 23 rule checks pass. On 771 cached songs, blanks kept: Easy 92%, Medium 88%, Hard 78%; no song left without blanks at any level. Most repetitive song ("Love Tonight", 21 lines): Medium went from 19 blanks of one word ("tonight") to 7 blanks of 3 words (tonight, need, love, with "tonight" back on line 9).

## 2. 15-second countdown (`play/PlayClient.tsx`, `LyricBlank`)
- [x] `WAIT_LIMIT_MS = 15_000`. When `held` turns true, record the start time. The countdown is worked out from the clock (`performance.now()`), not by counting ticks, so it stays right when the tab is in the background (browsers slow timers there).
- [x] A ticker (every 250 ms while held) re-renders the seconds left. Shown next to the active blank, red in the last 5 seconds. The help line keeps "The song waits for you…".
- [x] At 0: every open blank on the current line becomes `missed` (keeping whatever was typed). The help line says "Time's up. It was “x”." (the last missed word, as for "Too slow"). The hold is released by the existing logic, since no blank is open, and the song continues.
- [x] Answering or skipping the last open word stops the countdown (the hold ends, as now). Wrong tries don't touch it.
- [x] Hard: one countdown per wait, not per word. A second open word on the same line doesn't restart it.
- [x] Playback dropped (`status.kind === "dropped"`): the countdown is cancelled. A new hold after "Resume here" starts a fresh 15 s.
- [x] Results: a word missed with nothing typed shows as **revealed**, not wrong with an empty guess. Change `blankState` so `missed` with an empty value is `revealed`, and add a rule check for it.
- [x] Streak and score need no change: `missed` already scores 0 and breaks the streak.
- Also: the miss message now carries over to the next line ("Time's up." / "Out of tries." / "Too slow."), since the song moves on right after a miss and the message used to vanish at once. Out-of-tries misses used to show "Too slow." there.
- Note: "your last guess" means what's in the box when time runs out. A wrong try clears the box, so a word that ran out right after a wrong try shows as revealed.
- Result (2026-10-03): 28 rule checks pass, lint and build pass. Not yet seen on a real account.

## 3. Lyrics that move (`play/PlayClient.tsx`, `play.module.css`, `usePlayer.ts`)
- [x] **Glide:** render the previous, current and "· · ·" lines as elements keyed by line number, so when the line changes the same element moves from "current" to "previous" instead of being replaced. Animate `transform` and `opacity` (not font size, which would make the layout jump). The new line slides in from below; the line before the previous one fades out above. About 350 ms.
- [x] **Sweep:** `usePlayer` exposes `getPositionMs()` (reads its existing clock). A `requestAnimationFrame` loop on the play screen works out how far through the current line the song is, from the line's start to the next line's start (or the song's end on the last line). It lights each word once the sweep reaches its share of the line's characters, by writing a data attribute straight onto the word elements, so typing doesn't re-render at 60 fps. Blanks light up like words (their border/underline).
- [x] While held, the clock already stays just before the next line, so the sweep sits at the end of the line with no extra logic. While paused or dropped, the loop stops. On resume it reads the clock again, so it continues from the right spot.
- [x] `prefers-reduced-motion`: no glide transition, and the whole current line is lit (no sweep). `LyricBlank`'s shake already respects it.
- [x] Focus: the active blank's text box keeps focus across the glide. Check it doesn't lose focus when its element moves.
- [x] The line shown always comes from `lineIndex` (the song's position), never from the animation. The animation only follows it.
- Also: while the song waits for an answer, the whole line is lit. The song stops ~300 ms before the next line, which would otherwise leave the last word dim.
- Result (2026-10-03): lint and build pass. Not yet seen on a real account.

## 4. Close v1 (on your real account)
Each of these, seen on screen, with a clear message (never a crash, blank or frozen screen):
- [ ] **Session expired:** remove the app's access at Spotify (Account → Apps → Remove access), then use the app. It should go back to login with the expiry banner. Reconnect afterwards. *(Phase 1, never seen on a real expiry.)*
- [ ] **Lyrics service down, list:** point `LRCLIB_GET_URL` (`src/lib/lyrics.ts`) at an unreachable host for the test only, and open a list with unchecked songs. The "couldn't be checked" notice with Retry, nothing greyed out. Revert afterwards. *(Phase 2.)*
- [ ] **Lyrics service down, song screen:** same setup, open a song whose lyrics aren't cached. "The lyrics service is having a moment." with Retry. *(Phase 2.)*
- [ ] **Browser blocks sound:** in Firefox (Settings → Privacy & Security → Autoplay → Block audio and video), open a play URL directly. "Start the music" appears and works. *(Phase 3, never seen in Chrome/Edge.)*
- [ ] **The rest of spec.md's "Errors and safety":** a song without synced lyrics is greyed out with a note; Spotify failing shows a clear message (library Retry, play screen errors); only you can log in; the full lyrics are never shown at once.
- [ ] Any problem found gets fixed here. If it points to a wrong rule, correct the spec first.
- [ ] Update spec.md: Musixmatch → LRCLIB.

## 5. Checks
- [ ] `npm run lint` and `npm run build` pass.
- [ ] Rule checks pass (old + new).

## Acceptance check (tied to phase-5-spec.md's Success section)
- [x] Leave a word open: the song pauses, the 15 s countdown runs and turns red at 5, at 0 the word is revealed, scores 0, resets the streak, and the song continues by itself
- [x] Answering mid-countdown continues the song immediately
- [x] On Hard, a line with two open words has one countdown
- [ ] Spotify moving to another device during the countdown cancels it; after Resume, a fresh 15 s
- [x] A short, repetitive song on Medium: no word hidden twice within 8 lines; the song screen's blank count matches the play screen
- [ ] Lines glide up; the sweep reaches the end of each line about when the next one starts; typing is never interrupted
- [ ] With "reduce motion" on, nothing glides and the line is fully lit
- [ ] All four untested error states seen on screen (section 4)
- [ ] Phase 4's acceptance checks still pass (quick replay at each level)

## Before approving this plan
- [ ] The order still makes sense to you
- [ ] Nothing from the spec is missing
- [ ] Nothing from Phase 6 (home page, history, library search/filters/pins) crept in
