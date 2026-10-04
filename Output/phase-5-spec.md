# Spec: Phase 5 — Game Polish
Date: 2026-10-03
Part of: Lyrics Game (see spec.md for the full project, plan.md for the phase roadmap)
Builds on: Output/phase-4-spec.md (the game)

## Overview
Phase 5 makes the game feel finished and closes v1. The song no longer waits for ever: you get 15 seconds, then it moves on. The same word stops being hidden over and over in short songs. The lyrics move with the song instead of sitting still. Every error state from the main spec is confirmed on your real account, so v1 can be called done.

## Target users
Same as the main spec: a single user (you), using your own Spotify Premium account, on a desktop browser with a keyboard. Many of the songs are in Spanish.

## Scope

### This phase does
- **A 15-second countdown** when the song waits for a word, after which the word is missed and the song continues.
- **Spaced-out hidden words:** a word that was just hidden isn't hidden again for a while.
- **Lyrics that move:** lines glide up as the song reaches them, and a highlight sweeps across the current line.
- **Close v1:** every error state in spec.md's "Errors and safety", plus the four left untested in Phases 1–3, checked on your real account.

### This phase does not do
- A home page, saved scores, history or progress (Phase 6).
- Library search, genre filters, playlists-first navigation, favorites or "save for later" (Phase 6).
- Sing mode, a missed-words mini-game, or anything else from the V2 list below.
- Follow the actual beat or the singer word by word. The lyrics only have a time for each line, so the motion follows the lines (see "Lyrics that move").
- Change the difficulty levels, points, tries or matching rules from Phase 4.

## Expected behavior

### The countdown
1. As in Phase 4, if a line is about to end with a word still open, the song pauses just before the next line.
2. A countdown starts at 15 seconds and is shown clearly next to the open blank, along with the help line "The song waits for you…". In the last 5 seconds it turns red.
3. Answering every open word on the line, or skipping them with Enter, stops the countdown and the song continues, exactly as now.
4. Wrong tries don't reset or shorten the countdown. Your 3 tries per word still apply: run out of tries and the word is missed straight away.
5. **When it reaches 0:** every word still open on that line is missed. It's revealed (with your last guess crossed out if you'd typed one), it scores nothing, the streak resets, the help line reads "Time's up. It was “corazón”.", and the song continues by itself.
6. On Hard, a line with two open words shares one countdown.
7. If you answer before the line ends, the song never stops and there's no countdown, as now.
8. If playback drops during the countdown (Spotify moves to another device), the countdown is cancelled. After "Resume here", if the word is still open when the line ends, the song waits again with a fresh 15 seconds.
9. **Results:** a word missed by the countdown appears in "Your guesses" like any other missed word: wrong (your guess plus the answer) if you'd typed something, revealed if not.

### Spaced-out hidden words
10. Once a word is hidden, it isn't hidden again in the next 8 lines. On those lines, another suitable word is hidden instead (longest first, as now), or there's no blank if none fits. After 8 lines it can be hidden again.
11. "The same word" ignores capitals and accents, so "Corazón" and "corazon" count as one.
12. Word choice stays fixed: a song at a given difficulty always hides the same words, so scores stay comparable.
13. The song screen's blank count ("38 blanks · 42 lines") reflects the new choice. Some songs will have slightly fewer blanks than before.

### Lyrics that move
14. When a new line starts, the lines glide up smoothly: the current line moves up to become the small, grey previous line, and the new one slides into the middle. No jumps.
15. While a line plays, a highlight sweeps across it from left to right, reaching the end when the next line is due. It's spread evenly over the line, so it shows roughly where the singer is, not exactly. Blanks are part of the sweep, so you can see when a hidden word is coming.
16. When the song waits for you, the sweep stays at the end of the line until the song continues.
17. When paused, the lyrics stay hidden as now, and the motion picks up where it left off when you resume.
18. The next line is still never shown, only "· · ·".
19. If your computer is set to reduce motion, lines change without gliding and there's no sweep (the line is shown fully lit).
20. The text box stays focused and typing is never interrupted by the motion.

### Closing v1
21. Each of these is checked on your real account and shows a clear message, never a crash, blank or frozen screen:
    - **Session expired:** back to the login screen with the expiry banner (Phase 1, never seen on a real expiry).
    - **Lyrics service down while checking a list:** the "couldn't be checked" notice with Retry, and nothing greyed out by mistake (Phase 2, never seen on screen).
    - **Lyrics service down on the song screen:** "The lyrics service is having a moment." with Retry (Phase 2).
    - **Browser blocks sound:** the "Start the music" button appears when the play screen is opened directly, without a click (Phase 3, never seen).
    - Every other point in spec.md's "Errors and safety".
22. Any problem found is fixed in this phase. If one points to a wrong rule in a spec, the spec is corrected first.

## Errors and safety
- Everything from Phases 1–4 still applies.
- **Countdown and pausing:** the play/pause button stays disabled during the countdown, as during the wait now, so pausing can't stop the clock.
- **Countdown and tab switching:** the countdown keeps running if you switch to another tab. Coming back after it ran out, you find the song already continuing.
- **A song where spacing leaves a level with no blanks:** that level's "Play the song" is disabled with "No words to guess at this level.", as in Phase 4.
- **Motion and slow computers:** if the motion stutters, the lyrics' timing must never fall behind the music. The line shown always matches the song's position.

## Success
- Leave a word open: the song pauses, a 15-second countdown runs and turns red near the end, and at 0 the word is revealed, scores nothing, resets the streak, and the song continues by itself. Answering mid-countdown continues the song immediately.
- Play a short, repetitive song on Medium: no word is hidden twice within 8 lines, and the song screen's blank count matches the play screen.
- The lines glide up as the song reaches them and the sweep reaches the end of each line about when the next starts. With "reduce motion" on, nothing glides.
- All four untested error states have been seen on screen and behave as described. Every point in spec.md's "Errors and safety" checked.
- After this, v1 in spec.md is done.

## Scope decisions made in this pass
- **Plan.md's Phase 5 was already built:** the difficulty selector (Phase 4), greyed-out songs without lyrics (Phase 2) and styling (following the design all along). Phase 5 was redefined as closing v1, plus the time limit Phase 4 left open and two play-test complaints.
- **Time limit:** a fixed 15 seconds, the same on every level, starting when the song pauses, not when the line begins. The word is missed when it runs out. Rejected: points that shrink while waiting, and a limit per difficulty.
- **Repeats:** spaced out (8 lines), not banned for the whole song, so a word in a chorus can come back later in the song.
- **Motion:** follows each line's time, since the lyrics have no word or beat timing. The sweep is an estimate, accepted as "roughly where the singer is".
- **Split:** the main-page ideas from this interview (home page with progress, library search, filters and pins) became Phase 6, a separate spec, so this phase stays small enough to test.
- **Lyrics source:** spec.md still names Musixmatch; it's been LRCLIB since Phase 2.

## Phase 6 — Home & library (to spec next)
From the same interview (2026-10-03), for its own spec:
- Save every game (song, difficulty, score, accuracy, guesses).
- A home page with your progress: last songs played, top songs by accuracy, words you keep missing.
- Library: playlists and their song counts first, then search within a playlist; a search bar; filters by genre.
- Favorite or pin songs, and save songs for later.

## V2 (optional)
- **Sing mode:** complete the lyrics with your voice instead of typing.
- **Missed-words mini-game:** practise the words you keep missing (needs Phase 6's history).
- Random word choice on each play, hint letters, or multiple-choice mode (from Phase 4).
