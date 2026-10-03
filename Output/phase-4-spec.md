# Spec: Phase 4 — The Game
Date: 2026-10-03
Part of: Lyrics Game (see spec.md for the full project, plan.md for the phase roadmap)
Builds on: Output/phase-3-spec.md (playback and line timing)
Screens, rules and copy: the song ("Setup"), play ("PLAY") and results ("RESULTS") screens and the game logic in the design prototype (`Lyrics Game.dc.html`)

## Overview
Phase 4 turns playback into the game. You pick a difficulty and play a song. As it reaches each line, the lyrics appear with some words hidden, and you type them before the line moves on. Right guesses score points and build a streak; missed words are revealed. When the song ends, a results screen shows your score, accuracy and every guess.

## Target users
Same as the main spec: a single user (you), using your own Spotify Premium account, on a desktop browser with a keyboard. Many of the songs are in Spanish.

## Scope

### This phase does
- **Difficulty:** Easy, Medium and Hard on the song screen, chosen before playing.
- **Lyrics with hidden words** on the play screen, in time with the music; you type each hidden word before its line ends.
- **Score, streak, and a results screen** at the end of the song.

### This phase does not do
- Save scores or keep a history (V2 in spec.md).
- Multiple-choice answers. You always type.
- Hint letters, slowing the song down, or rewinding a line.
- Random word choice. A song at a given difficulty always hides the same words, so scores can be compared (random choice is V2 below).

## Difficulty (from the design)
| Level | Hidden words | Points per word |
|---|---|---|
| Easy | One word every other line | 100 |
| Medium (default) | One word on every line | 150 |
| Hard | Two words on every line | 200 |

Hidden words are meaningful words of at least 4 letters, never filler words (e.g. "that", "with", "your", "para", "pero", "cuando"). Within a line, the longest words are hidden first. A line with no suitable word has no blank.

## Expected behavior
1. **Song screen:** below the summary, three difficulty options (Medium selected) with a one-line description of the selected level, e.g. "One word on every line. 150 points each.", and a summary such as "38 blanks · 42 lines · 3:51". Then "Play the song".
2. **Play screen, top bar:** "Quit song", then chips for difficulty, "Line 3 of 42", score ("450 pts") and "Streak 3".
3. **Before the first line:** "Get ready. The first line is coming."
4. **As each line starts:** it appears large in the middle with its hidden words as blanks. The previous line stays above it, small and grey, with its answers filled in. The next line is never shown, only "· · ·". The screen never shows lyrics the song hasn't reached.
5. **Typing:** the first open blank in the current line has a text box, already focused. Your guess is checked as you type:
   - Correct as soon as it matches: the word turns green, you score the level's points, and the streak goes up ("Got it." or, from 3 in a row, "Got it. 3 in a row."). The next blank in the line, if any, becomes active.
   - Enter on a non-empty wrong guess: "Not it. Keep trying before the line moves on."
   - Enter on an empty blank skips it: the word is revealed ("Skipped. It was “night”.") and the streak resets.
6. **The song waits for you.** If a line is about to end and it still has an unanswered word, the song pauses just before the next line starts (on the last line, just before the song ends). The lyrics stay visible, the play/pause button is disabled, and the help line reads "The song waits for you. Type the word, or press Enter on an empty blank to skip." The song continues by itself as soon as the word is right or skipped. If you answer before the line ends, it never stops. There's no time limit for now. *(Added 2026-10-03 at the user's request, replacing the design's rule that an open word was missed when the line moved on. "Too slow. It was …" remains only as a fallback.)*
7. **Matching is forgiving:** capital letters, punctuation, accents and ñ don't matter. "corazon" counts for "corazón", "ano" for "año", "dont" for "don't".
8. **Pausing** (the player bar's button, or Spotify moving to another device): the lyrics are hidden behind the pause message and typing is disabled until you resume, so pausing can't be used to buy thinking time.
9. **Quit song:** stops the music and returns to the song screen. No results.
10. **When the song ends:** the results screen opens with:
    - a chip with "Song — Artist"
    - a verdict by accuracy: 100% "Flawless. Are you in the band?", 80%+ "You actually listen. Respect.", 50%+ "Decent. The chorus carried you.", above 0 "Were you even listening?", 0 "Nothing. Humming doesn't count."
    - "You got 31 of 38 words in Song."
    - four stats: Score (with "150 per word"), Accuracy (with "31 of 38 words"), Best streak ("In a row, no misses"), Difficulty
    - buttons: "Play again" (same level), "Try Hard" / "Try Medium" (the next level up, hidden on Hard), "Pick another song" (back to the library list)
    - "Your guesses": every hidden word in order, shown as right (green), wrong (what you typed, plus the answer), or revealed (missed without typing)

## Errors and safety
- Everything from Phase 3 still applies: no Premium, unsupported browser, player not starting, playback moving to another device (now also hides the lyrics), session expiry.
- **A song with no words to hide at a level** (very short lines only): that level's "Play the song" is disabled, with a note "No words to guess at this level."
- **Lyrics fail to load** for the game: the song screen's existing "The lyrics service is having a moment." message with Retry.
- **Hiding:** the screen only ever shows the current and previous lines. The full lyrics are part of the page's data, so they can be found with the browser's developer tools. That's accepted, since you're the only player (decision below).

## Success
Play one song at each difficulty. The number of blanks matches the song screen's summary. Typing a hidden word (without accents, on a Spanish song) turns it green and adds the right points. Leaving one empty reveals it when the line ends and resets the streak. Pausing hides the lyrics. At the end, the results screen's score, accuracy, best streak and guess list match what happened, and Play again / Try harder / Pick another song do what they say.

## Scope decisions made in this pass
- **Accents optional** (and ñ, capitals, punctuation), since typing speed matters mid-song.
- **Lyrics hidden while paused**, so pausing isn't a way to think longer.
- **Hidden on screen only:** the lyrics text reaches the browser and only the current and previous lines are shown. Someone using developer tools could peek; as the only player, you'd only spoil your own game. Keeping answers on the server was rejected as more to build for no real benefit here.
- **Difficulty picker moves into Phase 4** (plan.md had it in Phase 5), since the game can't be tested without it.
- **The Phase 3 rule "song end returns to the song screen"** is replaced by the results screen.

## Next to decide
- **A time limit for the wait** (user's idea, 2026-10-03): e.g. after N seconds the song continues and the word counts as missed, and/or fewer points the longer you take. To be decided after playing with the open-ended wait.

## V2 (optional)
- Random word choice on each play.
- Saved scores and personal bests per song.
- Hint letters, or multiple-choice mode for an easier level.
