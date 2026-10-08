# Spec: Phase 8 — Sing mode
Date: 2026-10-08
Part of: Lyrics Game (see spec.md for the full project, plan.md for the phase roadmap)
Builds on: Output/phase-4-spec.md and phase-5-spec.md (the game and its levels), Output/phase-6-spec.md (saved games and the home page)

## Overview
Typing the missing word tests whether you know the lyrics; singing them is how you actually know a song. Sing mode is a second way to play any song: instead of typing one hidden word, you sing whole hidden lines over the music, karaoke-style, and the app listens. Each word it hears fills in on screen and earns points. Sung games are saved to your progress, marked as sung, and compared only with other sung games.

## Target users
Same as the main spec: a single user (you), on your own Spotify Premium account, on a desktop browser, now **with a microphone and headphones**. You know many of your songs well enough to sing them, and typing a single word feels too easy on those.

## Before the plan: test the hard part first (step 0)
Sing mode depends on something this app has never done: understanding a voice. Before the plan is written, a one-hour test on this computer answers four questions. If any answer is "no", this spec is changed before building, not patched afterwards.
1. Does the browser understand you singing (not speaking) in **English** and in **Spanish**?
2. Does it keep listening for a whole song, or stop after a pause?
3. With headphones on, does the microphone stay clear of the music?
4. Does it hear words fast enough to fill a slot while the line is still being sung (within about a second)?
The results are written into this spec under "Dependencies and risks".

## Scope

### This phase does
- **Choose Type or Sing** on a song's screen, next to the level.
- **Sing hidden lines over the music:** lines hidden by level, one slot per word, slots fill in as the app hears each word, points per word.
- **Results for a sung song:** score, words heard, accuracy, best streak of full lines.
- **Sung games saved** to your progress, marked with a microphone and kept separate where comparing makes sense.

### This phase does not do
- Judge pitch, rhythm or how well you sing. Only the words count.
- Work without headphones. The app asks you to put them on; it doesn't try to remove the singer's voice from what it hears.
- Pause or slow the music for you. The song keeps playing, as in karaoke.
- Show the full lyrics of a hidden line before it ends (the "lyrics never shown in full" rule still holds for hidden lines).
- Record or keep your voice. Nothing you sing is saved, only which words were heard.
- Change Type mode in any way.

## Expected behavior

### Choosing Sing
1. On a song's screen, above the levels, a choice: **Type** (as now, selected by default) or **Sing**.
2. The first time you pick Sing, a short note: "Sing mode listens through your microphone. Put on headphones so it hears you, not the singer." Then the browser asks for microphone permission. The note isn't shown again once you've allowed it.
3. The levels describe what they mean in Sing mode:
   - **Easy:** every other line is hidden. 100 points per word.
   - **Medium:** every line is hidden. 150 points per word.
   - **Hard:** every line is hidden, and the slots don't show how many words the line has; words appear only as they're heard. 200 points per word.
4. The app remembers your last choice (Type or Sing) for the next song.

### Playing
5. The play screen looks like Type mode: the lyrics scroll, the current line is lit. Lines that aren't hidden show as normal. A small microphone light shows the app is listening (it pulses when it hears sound).
6. A hidden line shows **one empty slot per word** (on Easy and Medium). While the line is being sung, each word the app hears fills its slot. Words must match the lyrics the same forgiving way typing does (case, accents and apostrophes don't matter).
7. Words heard out of order still count if they belong to that line, each word once. Words from another line don't count.
8. A word counts for its line if it's heard during the line, or up to about a second before it starts or after it ends. *(Changed after step 0: first words of a line were often sung, or timed in the lyrics, slightly early and got lost to the line before.)*
8b. Small differences in how a word is heard count as a match when they're clearly the same word: a missing accent or final letter ("parque" for "parqués"), or a word heard split in two ("amando te" for "amándote"). *(Added after step 0.)*
9. When the line ends, any empty slots show the missing word in red, and the line shows its count ("5 of 7").
10. The music never stops or waits. There's no countdown, unlike Type mode.
11. A **Pause** button pauses both the music and the listening, as in Type mode.

### Results
12. Same results screen as Type mode, with Sing shown next to the level: score, words heard out of words hidden (accuracy), best streak of full lines (every word heard), and the verdict.
13. "Play again" replays in Sing mode at the same level; "Try typing" switches to Type at the same level.

### Progress on home
14. Every finished sung song is saved like a typed one, marked with a microphone in Recently played.
15. **Best songs** keeps sung and typed games apart: a song can appear once for each, each with its microphone or keyboard mark.
16. **Words you keep missing** counts only typed games. Sung misses are often the app mishearing, not you forgetting.
17. **Overall stats** show typed and sung totals separately ("Typed: 24 songs, 81%" / "Sung: 3 songs, 68%").

## Errors and safety
- **No microphone, or permission denied:** Sing can't start. The song screen shows "Sing mode needs your microphone." with how to allow it, and Type stays available.
- **The browser can't understand speech:** Sing is shown greyed out with "Sing mode doesn't work in this browser." Type works as normal.
- **Listening stops mid-song** (the browser stops on its own, or the connection drops; step 0 saw it stop every ~8 seconds of silence and twice mid-song): the app restarts listening without stopping the music. If it can't, the microphone light turns red with "Not listening — tap to retry", and lines sung while it was off count as missed (the results say "Listening was off for part of this song").
- **Silence or mumbling:** nothing fills in; the line scores 0. No guessing on your behalf.
- **The singer heard instead of you** (no headphones): the app can't tell, so it can't block it. The note on choosing Sing and the "This phase does not do" rule cover it; the success test checks it.
- **Quitting mid-song:** as in Type mode, nothing is saved.
- **Saving fails, session expired:** handled exactly as in Phase 6 and earlier phases.
- **Privacy:** your voice is turned into words by the browser's speech service and then thrown away. The app never stores or sends recordings, and only keeps which words were heard. If the browser's speech service sends audio off this computer (likely; step 0 confirms), the first-time note says so.

## Success
- **Step 0** answered all four questions with "yes", or this spec was changed to match what's possible.
- With headphones on, you sing **one English and one Spanish song you know well on Medium** and get at least **70%** of the words.
- On the same song, staying silent scores 0, and mumbling scores under 10%.
- Every word you clearly sang in a line fills its slot before the line is over, or within a second of its end.
- On Hard, the slots don't show the number of words.
- A sung game shows on home with a microphone. Best songs shows the song separately for typed and sung. Words you keep missing doesn't change after a sung game.
- Denying the microphone leaves Type fully playable.
- Type mode plays exactly as before.

## Dependencies and risks
- **The browser's speech recognition** (the only voice service this phase relies on). Risk: built for speaking, not singing over music; may be worse in Spanish; may stop after pauses; may send audio to an outside service. Checked in step 0 before the plan.

### Step 0 results (2026-10-08, Chrome, wired-in test page, your voice)
| Question | Answer | Evidence |
|---|---|---|
| 1. Understands singing, English and Spanish | **Yes** | Shakira "Inevitable" (Spanish, Latin America setting): 78% of words heard, 84% if a word may count for the line next to it. The Beatles "I Will" (English): 65%, 71% with the same rule. |
| 2. Keeps listening for a whole song | **Yes, if restarted** | The browser stops by itself (twice mid-song, and every ~8 s when it hears nothing). Restarting right away took 10–17 ms; nothing was lost. |
| 3. Headphones keep the music out | **Yes** | Whole song at normal volume, staying silent: 0 words heard, no speech detected. |
| 4. Fast enough | **Yes** | 89–95% of heard words showed up before their line ended, the rest within 1 second after. |

What the misses were, and what changed in this spec because of them:
- **First word of a line credited to the line before** (sung slightly early, or the lyrics' timing slightly late) → item 8 now allows about a second either side.
- **Near-misses:** "parque" / "parqués", "amando te" / "amándote", "and dear" / "endear", "uno mismo" / "un mismo" → item 8b.
- **Plain mishearing** ("comí una vez" for "conmigo nada es"): can't be fixed; it's why scoring is per word.
- **Privacy:** recognition ran through the browser's online speech service (your voice is sent to Google to be turned into words). On-device recognition wasn't tried. The first-time note says so.
- **Spotify:** no new requests. Sing mode uses the same playback and lyrics as Type.
- **LRCLIB lyrics timing:** each line's start time decides when a hidden line begins and ends. Lines with poor timing will feel unfair; no new risk, but more noticeable when singing whole lines.

## Scope decisions made in this pass
- **Whole lines, not single words** (your choice): closer to karaoke, harder to check, hence step 0.
- **Levels like typing:** Easy every other line, Medium every line, Hard every line without word slots. *(Hard's rule was proposed in writing this spec; change it if you'd rather Hard work differently.)*
- **Points per word heard**, not right/wrong per line, so one misheard word doesn't cost a whole line.
- **The music keeps playing**, so headphones are required.
- **Slots fill in as heard** for live feedback, without giving the words away.
- **Sung games saved, marked and compared only with sung games**; missed words stay typed-only.
- **Success:** two songs you know (English and Spanish), 70% on Medium.

## V2 (optional)
- Singing just the hidden word in a typed-style game, or a sing-along mode with no blanks where each word lights up as you sing it.
- Only the chorus hidden.
- Pausing the song for you to sing a line, or lowering the singer's voice instead of requiring headphones.
- Judging pitch or rhythm.
- Sung misses in "Words you keep missing".
- Everything from earlier V2 lists (missed-words mini-game, progress over time, game variety, …).
