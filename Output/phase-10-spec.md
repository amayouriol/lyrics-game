# Spec: Phase 10 — Lyric Drop look for the song screen ("Set up your game")
Date: 2026-10-10
Part of: Lyric Drop (see spec.md for the full project, plan.md for the phase roadmap)
Builds on: Output/phase-9-spec.md (the new look), Output/phase-8-spec.md (Type or Sing, language note, microphone)
Design: the Figma Make screen "Set up your game" (`GameSetupScreen` in `design/figma-make/`, screenshot and texts from you, 2026-10-10). The game screen and the results screen keep their current look until their Figma designs are ready.

## Overview
The screen where you pick how to play a song gets the Lyric Drop look: the album cover on the left; on the right "Set up your game", the song's name and artist, How you play (Type / Sing), Difficulty with its points, a sentence explaining the level, the count and length, the language note for Sing, and a big start button with the heart and bookmark beside it. Nothing about how the game plays changes.

## Scope

### This phase does
- The new look for the song screen, following the Figma screen, with text sizes like the other Lyric Drop pages.
- Your texts for each mode and level (below), and "Why choose a language?" as the title of the "?" explanation.

### This phase does not do
- Change the game screen or the results screen (next, when their Figma designs are ready).
- Change any rule, level, count or how the microphone and language work.

## Expected behavior
1. **Top left:** "Back to library", returning to the list you came from, as now.
2. **Left: the album cover**, square, as Spotify gives it, with "Selected from your library" under it. **No text or shapes over the cover** (Spotify's rules forbid covering or cropping album art; the Figma draft's "Lyric Drop presents" title on the cover is used only for songs without a cover).
3. **Right:** "SET UP YOUR GAME", the song's name large, the artist.
4. **How you play:** Type and Sing side by side ("Choose one"); the chosen one is purple. Sing has a microphone. Remembered for the next song, as now. In a browser that can't listen, Sing is greyed out with "Sing mode doesn't work in this browser. Try Chrome or Edge."
5. **Difficulty:** Easy, Medium, Hard (Medium at first), with "100 / 150 / 200 points per word" on the right.
6. **Under them, the level explained**, then the count and the song's length, from the song's real numbers:
   - Type, Easy: "One word every other line is hidden. Type it as it's sung." — "N words to type · 3:54"
   - Type, Medium: "One word on every line is hidden. Type it as it's sung."
   - Type, Hard: "Two words on every line are hidden. Spelling matters."
   - Sing, Easy: "One line in three is hidden. Sing it; the song waits up to 10 seconds." — "N lines to sing · 3:54"
   - Sing, Medium: "Every other line is hidden. Sing it; the song waits up to 10 seconds."
   - Sing, Hard: "Every line is hidden. Keep singing—the song doesn't wait."
7. **Sing only, the language note:** microphone icon, "Listens for **Spanish** words", "Change", and "?". The "?" opens: **Why choose a language?** "Sing mode turns your voice into words in one language at a time. It's set to Spanish, picked from this song's lyrics. If you'll sing it in English, change it. The song itself doesn't change." (The language named follows the song; "picked from this song's lyrics" only shows when it was.) If the app can't tell the language: "Will you sing in English or Spanish?" with two buttons, as now.
8. **The start button:** "TYPE THE LYRICS" with an arrow, or "SING THE SONG" with a microphone. Greyed out when there's nothing to play at that level, or Sing isn't ready (microphone, language).
9. **Heart and bookmark** beside it, round, filled purple when on.
10. **Sing, first time or microphone blocked:** the headphones note and "Allow the microphone", or the blocked / no microphone messages, as now, in the new look.
11. **Loading, no lyrics, errors:** the same messages as now ("Fetching synced lyrics…", "Lyrics not available", lyrics service or Spotify trouble with Retry), in the new look.

## Success
- The screen looks like the Figma screen at your usual desktop size, with the real cover untouched.
- Each of the six texts shows for its mode and level, with the song's real counts.
- "?" shows "Why choose a language?" and its explanation; Change switches the language.
- Starting, saving to Favorites / Play later, microphone and language work exactly as before.
- No new Spotify requests.

## Scope decisions made in this pass
- **Real album cover, nothing over it** (Spotify's rules), instead of the design's generated cover with the title on it.
- **Your texts** for modes, levels and the language explanation (2026-10-10).
- **Start button text:** "Type the lyrics" / "Sing the song", from the design (was "Play the song").
