# Spec: Phase 11 — Lyric Drop look for the game and results screens
Date: 2026-10-10
Part of: Lyric Drop (see spec.md for the full project, plan.md for the phase roadmap)
Builds on: Output/phase-9-spec.md and phase-10-spec.md (the Lyric Drop look), phase-5 and phase-8 specs (how the game and Sing mode play)
Design: made by Claude from the Lyric Drop look (you had no Figma tokens left), shown as a mockup on 2026-10-10, with your requests: a bigger player bar, only points and streak at the top, no level, and "Line N of M" in the center under the instructions.

## Overview
The last two screens still in the old white look get the Lyric Drop look: the game screen (Type and Sing) and the results screen. The game screen becomes a dark stage, like karaoke: the lyrics in the middle, your points and streak at the top right, the instructions and the line count under the lyrics, and a bigger player bar at the bottom. The results screen gets a big verdict, four stat tiles, and your guesses below. Nothing about how the game plays changes.

## Scope

### This phase does
- **Game screen, Type and Sing:** dark page, top row, lyrics, instructions with the line count, bigger player bar, pause / error panels.
- **Results screen, Type and Sing:** verdict, stats, buttons, your guesses (Type) or your lines (Sing).

### This phase does not do
- Change any rule, timing, scoring, or how listening works.
- Add the top bar (Home · Library) to the game screen; it stays focused on the song. The results screen keeps the top bar, as now.

## Expected behavior

### Game screen
1. **Dark page** (the Lyric Drop black), full height.
2. **Top row:** "← Quit song" on the left. On the right, **only two tiles: points ("1,275 PTS") and streak ("4 STREAK")**, numbers large in light violet. **No level, no line count up here.** In Sing, the microphone light sits in the center with the instructions (item 5), not up here.
3. **Lyrics in the middle:** the line before small and dim; the current line large and white, the words not reached yet dimmed until the song reaches them (as now); "· · ·" for the next line.
4. **Blanks (Type):** a violet underline; what you type in light violet; right turns violet, wrong shakes and shows red, missed shows the answer in grey. The countdown is a violet circle next to the blank, turning red for the last 5 seconds. **Slots (Sing):** one slot per word, filling in white as heard; missing words red at the end of the line; the line's count ("5 of 7").
5. **Under the lyrics, centered:** the instructions or the last result ("Right!", "It was 'noche'", "The song waits for you…"), then **"LINE 13 OF 52"** in small capitals. In Sing, the microphone light (pulsing when it hears sound, red "Not listening — tap to retry" when off) sits with them.
6. **Player bar, bigger** (about 88 px instead of 72): cover 56 px, title and artist larger, a round violet play / pause button (52 px) with proper icons, times, and a thicker progress line in violet.
7. **Panels** (paused, Spotify playing elsewhere, sound blocked, player errors): dark cards with a violet edge and a light button, same words as now.

### Results screen
8. **Top, dark:** "SONG COMPLETE · <SONG>" small in violet, the verdict huge ("NAILED IT."), "You got 28 of 32 words in Te Busco." (Sing: words heard).
9. **Four tiles:** Score, Accuracy, Best streak, Level (the level's short hint under it, as now). Large light-violet numbers, like the home page totals.
10. **Buttons:** "Play again" (light, with an arrow), "Try <next level>" (outlined) when there is one, Sing also "Try typing", and "Pick another song" as a quiet link.
11. **"Couldn't save this game" with Retry** when saving fails, as now.
12. **Below, on the light page:** "Your guesses" (Type): each hidden word as a chip, violet when right, red with your guess crossed out when wrong, grey when shown. Sing: each sung line with its words, heard ones dark, missed ones red, and the line's count.

## Success
- Both screens look like the mockup, at your usual desktop size, in Type and Sing.
- Only points and streak at the top; "Line N of M" under the instructions; no level on the game screen.
- The player bar is clearly bigger and play / pause works.
- Playing, pausing, the countdown, listening, saving and Play again / Try next work exactly as before.
- No new Spotify requests.

## Scope decisions made in this pass
- **Design by Claude** in the Lyric Drop look, approved from a mockup (your request).
- **Your requests:** bigger player bar; only points and streak at the top; no level; line count centered under the instructions.
- **No top bar during a song**, as now, so nothing distracts from the lyrics.
