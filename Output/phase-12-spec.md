# Spec: Phase 12 — Fixes after play-testing (harder levels, fewer repeats, home tweaks)
Date: 2026-10-11
Part of: Lyric Drop (see spec.md for the full project, plan.md for the phase roadmap)
Builds on: Output/phase-4-spec.md and phase-5-spec.md (Type levels and repeats), phase-9-spec.md (home), phase-10-spec.md (level texts)

## Overview
After playing the redesigned app, five fixes: Type mode's levels are too easy, the same word (like "love" in a chorus) gets hidden again and again, the music notes float too far from the record on the home page, the "Words that keep dropping" card should say how many songs a word was missed in, and the small labels next to your totals ("Songs typed") are too small.

## Scope

### This phase does
1. **Harder Type levels** (Sing mode doesn't change):
   - **Easy:** one hidden word on two lines out of three (two lines with a blank, then one without). Was: every other line.
   - **Medium:** two hidden words on every line. Was: one.
   - **Hard:** three hidden words on every line, four on long lines (9 words or more). Was: two.
   - Points per word stay 100 / 150 / 200, tries and the 10-second wait stay the same. A line with fewer words worth hiding gets fewer blanks, as now.
2. **No repeats, as far as possible:** a word hidden once in a song isn't hidden again in that song while the line has any other word worth hiding. Only when a line would otherwise get no blank at all may a word come back, and never within 8 lines of its last time (today's rule). So a chorus asks for its other words instead of "love" three times.
3. **Notes closer to the record** on the home page: the four floating notes sit just around the record instead of far out at the panel's edges.
4. **"Words that keep dropping" card:** counting already works from every finished Type game (checked 2026-10-11 on your games: your latest song added "Mine", "Patience", "heart", "love"…). The card's last line now says **"in 1 song"** with the song's name only when it's one song, and **"in 2 songs"** (or 3, …) when the word was missed in more than one, instead of naming one song.
5. **Bigger labels next to your totals** on the home page ("Songs typed", "Words guessed", "Accuracy", "Best streak", "Songs sung"): from 9 px to 13 px, numbers slightly larger too. *(You wrote "library section"; these labels are on the home page's Your progress panel.)*

### This phase does not do
- Change Sing mode, points, tries, waits, or how missed words are counted.
- Recount old games: games already saved keep their scores; new games use the new levels.

## Texts that change with the levels
- Song screen: Easy "One word on two lines out of three is hidden. Type it as it's sung." Medium "Two words on every line are hidden. Type them as they're sung." Hard "Three or four words on every line are hidden. Spelling matters."
- How to play, Type levels table: "One word on two lines out of three", "Two words on every line", "Three or four words on every line".

## Success
- On a song you know, Easy hides a word on two lines out of three, Medium two per line, Hard three or four.
- In a song with a repeated chorus, the same word isn't asked twice while the chorus has other words to ask.
- `npm test` checks the new counts and the no-repeat rule.
- The notes hug the record; the totals' labels are easy to read; the card says "in 2 songs" for a word missed in two songs.

## Scope decisions made in this pass
- **Easy = two lines out of three** (your choice: "1 blank every 1 or 2 lines").
- **Only Type mode** changes (your choice).
- **Long line = 9 words or more** for Hard's fourth blank.
- **Old games keep their scores;** Top performances may mix games from before and after the change.
