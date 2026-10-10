# Spec: Phase 9 — Lyric Drop: new look for Home, Library and How to play
Date: 2026-10-10
Part of: Lyrics Game, now **Lyric Drop** (see spec.md for the full project, plan.md for the phase roadmap)
Builds on: Output/phase-6-spec.md (home page and progress), Output/phase-7-spec.md (library), Output/phase-8-spec.md (Sing mode)
Design: the Figma Make file "Design main page for game", published at https://walnut-fizzy-99875581.figma.site (seen 2026-10-10). It replaces the original design handoff (.zip) **for Home, Library, How to play and the top bar only**. The song screen and the game screen keep their current look until their Figma designs are ready.

## Overview
The app gets its new name, **Lyric Drop**, and the look from the Figma design: a new top bar, a new home page, a new library page and a new How to play page. The game rules don't change. Two small things are new behind the screens: your Spotify name and picture (from the login the app already does) and a **current streak**: how many songs in a row you've finished at 80% or more.

## Target users
Same as the main spec: you, on your own Spotify Premium account, on a desktop browser.

## Scope

### This phase does
- **New name** everywhere you see it: top bar, browser tab, login and error pages, "Saved in Lyric Drop".
- **Top bar:** the Lyric Drop logo, Home · Library · How to play, and a round profile button (your Spotify picture, or your initials) that opens a small menu with your name, "Spotify Premium" and Log out.
- **Home:** "Welcome back, <your name>", "Ready for another song?", Pick a song; Your progress (the record with your current streak, plus your five totals); Recently played; Top performances; Words that keep dropping.
- **Library:** "Find your next song." with search, and two tabs: **Saved in Lyric Drop** (Favorites and Play later) and **From Spotify** (Liked Songs and your playlists, with Spotify credited).
- **How to play:** a new page explaining the game, with a Type / Sing switch. The text matches the real rules exactly (see "How to play text").

### This phase does not do
- Change the song screen (level and mode choice) or the game screen. They keep the current look until the Figma designs for them are ready. They only pick up the new name and top bar.
- Change any game rule, score or level.
- The practice mini-game (V2). Its button is shown but does nothing (see item 11).
- A settings menu, a light theme or a phone layout.
- Rename the project folder, the GitHub repository or the login cookie (renaming the cookie would log you out for nothing).

## Expected behavior

### Name and top bar
1. The Lyric Drop logo (the same wordmark as the login page) on the left. It goes to Home.
2. **Home · Library · How to play** in the middle; the page you're on is underlined in purple.
3. On the right, a round button with your Spotify picture. If you have no picture, your initials; if the app doesn't know your name yet, a plain person icon. Clicking it opens a small menu: your name, "Spotify Premium", **Log out**. Clicking outside or pressing Esc closes it.
4. Your name and picture come from your Spotify profile, which the app **already asks for once when you log in** (it's how your games are kept under your account). They're kept with your login. **No new Spotify requests**, so nothing changes for rate limits, blocks or how long you stay logged in. Until you next log in, the app doesn't have your name: the greeting is just "Welcome back." Log out and in once to see it.
5. The browser tab reads "Lyric Drop".

### Home
6. **Top:** a small "WELCOME BACK, <NAME>" (or "WELCOME BACK" without a name), the big "Ready for another song?" and **Pick a song** (goes to the Library). First time, with no finished songs yet: "Welcome." and "Play your first song to start tracking your progress.", as now.
7. **Your progress** panel, "All-time totals":
   - The **record** shows your **current streak**: how many songs in a row, counting back from your most recent finished song, scored **80% accuracy or more**. Typed and sung songs both count, in the order you played them. A song under 80% ends the streak. "04 SONGS"; with none, "0 SONGS".
   - Next to it, the five totals, as now: **Songs typed** (or "Songs played" while you have no sung songs), **Words guessed**, **Accuracy** (typed games), **Best streak** (typed games), **Songs sung** (only once you've sung a song).
   - Just numbers, nothing to click.
8. **Recently played:** your last finished songs: cover, title, artist, "Medium · 26,700 pts · 11h ago", and a **Play again** button that plays the same song **at the same level and in the same mode** (as now). A song no longer in your library says so instead.
9. **Top performances:** your best songs by accuracy, as "Best songs" does now (typed and sung kept apart, each marked).
10. **Words that keep dropping:** your most-missed word large ("historia"), "Missed 2 of 5 times" and the song it's from; how many words in all you keep missing ("3 words to practice"). Same rule as now: missed at least twice, typed games only. With none: "No repeat misses yet. Nice."
11. On that card, a **Start practice queue** button marked **"Coming soon"**, greyed out. Clicking it does nothing. (The practice mini-game is V2.)
12. **Favorites and Play later move off the home page**: they live in the Library's first tab (item 14). *(Following the design.)*

### Library
13. **Top:** small "YOUR MUSIC", the big "Find your next song." and the **search box** (searches your whole library by title and artist, as now).
14. Two tabs, remembered while you browse:
   - **Saved in Lyric Drop** ("Your picks and game collections"): "Saved in the game", with how many songs; **Favorites** and **Play later** side by side, each with its songs and a play button; an empty list says "Your next songs live here. Bookmark any track to build a game queue."
   - **From Spotify** ("Liked songs and playlists"): Liked Songs and your playlists as cards, opening their pages as now. This tab shows Spotify's logo and "Songs and playlists from your Spotify library", as Spotify's rules ask when showing their content.
15. Playlist pages, search results and filters (only playable, language, played / not played) work exactly as now, with the new colors and fonts.

### How to play
16. A page in the top bar. Top: "How to play." and "Know the song. Fill the gaps." with the short intro, then three steps (Pick a song · Choose your game · Finish the lyrics) and "Good to know".
17. **Choose your mode:** a **Type / Sing** switch. Each shows its own levels table, rules and score explanation, word for word as in "How to play text" below.
18. "Back home" at the top goes to Home.

## How to play text
What the page says. Every number here is the game's real rule; if a rule changes later, this text changes with it.

**Intro:** Pick a song from your Spotify library. It plays with the lyrics on screen while some words or lines disappear. Complete them as the song goes.

**Steps:** 01 Pick a song: choose any playable song from your library. 02 Choose your game: Type or Sing, then a level. 03 Finish the lyrics: fill in the hidden words as the song plays.

**Good to know:** Spotify Premium is required; play in Chrome, Edge or Firefox. Pausing hides the lyrics until you press play again. If Spotify starts playing on another device, the game pauses here.

**Type mode: type the hidden words as they're sung.**
- Levels: Easy, one word every other line, 100 points a word. Medium, one word on every line, 150. Hard, two words on every line, 200.
- Three tries: right on the first try earns full points; each wrong try halves them (full, half, quarter). After three wrong tries the answer is shown and the word counts as missed. A wrong word as long as the answer counts as a try right away, without pressing Enter.
- Need to skip? Press Enter on an empty box. The answer is shown and the word counts as missed.
- The song waits up to 10 seconds: if a line ends before you finish its word, the song pauses. The last 5 seconds turn red. If time runs out, the word counts as missed.
- What counts as right: spelling matters; capitals, accents and apostrophes don't ("corazon" for "corazón", "dont" for "don't").
- Which words disappear: only real words. Everyday words like "that", "with", "para" and "pero", and sounds like "whoa" or "okay", stay visible. The same word isn't hidden again for 8 lines.
- Your score: **Score** is the points for every word you got. **Accuracy** is the share of hidden words you got right. **Best streak** is the most words in a row right on the first try.

**Sing mode: sing the hidden lines out loud.**
- Levels: Easy, one line in three, the song waits up to 10 seconds, 100 points a word. Medium, every other line, waits up to 10 seconds, 150. Hard, every line, the song doesn't wait, 200.
- Every word the game hears counts: no tries, no lost points. A word sung up to a second early or late still counts for its line.
- If a line ends with words missing (Easy and Medium), the song waits up to 10 seconds and keeps listening, and carries on as soon as you finish.
- Sounds like "oh", "yeah" or "la la", and most names, stay visible and don't count.
- Use headphones, so the game hears you and not the singer. The first time, your browser asks to use the microphone. Your voice is turned into words by the browser's online speech service; Lyric Drop never keeps recordings.
- The game listens for the song's language (English or Spanish); you can change it on the song's screen.
- Your score: **Score** is the points for every word heard. **Accuracy** is the share of hidden words heard. **Best streak** is the most full lines in a row (every word heard).

**Your progress:** finish a song to save it; songs you leave before the end aren't saved. Finished songs show in Recently played, Top performances and your totals. Your current streak counts songs in a row at 80% or more. Words that keep dropping lists words you've missed at least twice in Type mode; Sing mode misses aren't counted.

*(Two lines from the Figma draft were corrected here: "Fast, accurate answers earn the most points" — speed doesn't change points, only wrong tries do; and "Best streak: first-try words" — true for Type only.)*

## Errors and safety
- **Progress doesn't load:** "Your progress didn't load." with Retry, as now.
- **Spotify busy or blocked:** the library shows the same messages as now; nothing new asks Spotify for anything.
- **Session expired:** back to login, as now.
- **No name or picture** (older login, or none on your Spotify account): initials, or a person icon, and "Welcome back." without a name.

## Success
- The top bar, Home, Library and How to play look like the Figma design at your usual desktop size, with your real data.
- The record shows the right current streak (checked by `npm test` with made-up games, and against your own recent games).
- "Welcome back, <your name>" and your picture after logging out and in once.
- Play again starts the same song at the same level and mode.
- Start practice queue shows "Coming soon" and does nothing.
- Spotify's logo and credit show on the From Spotify tab.
- Every number on How to play matches the game; nothing claims speed earns points.
- The song and game screens work exactly as before.
- No new Spotify requests (checked by watching the requests the app makes).

## Dependencies and risks
- **Spotify:** no new requests. Name and picture come from the profile request the login already makes.
- **Spotify's logo:** must be the official file from Spotify's brand page, used as they say. Downloading it needs your OK.
- **Exact sizes from Figma:** the published page shows the look; the downloaded code from Figma Make gives exact spacing. Without it, sizes are matched by eye.
- **Your picture** loads from Spotify's image server, like song covers do now.

## Scope decisions made in this pass
- **Name:** Lyric Drop (your choice). Not renaming the folder, repository or login cookie.
- **Current streak:** songs in a row at 80% or more (your choice). Assumed: typed and sung songs both count, and 80% exactly counts.
- **Your name:** from Spotify, at no extra cost (your question: it doesn't add requests, shorten the session or risk a block).
- **Practice queue:** shown as "Coming soon", does nothing (your choice). The mini-game stays V2.
- **Play again:** same level (your choice), and same mode, as it already works.
- **Spotify credit:** on the From Spotify tab (your choice).
- **Favorites and Play later move from Home to the Library**, following the design.
- **How to play:** exact rules, with the two draft lines corrected (your request: "be accurate").
- **Song and game screens:** current look until their Figma designs are ready (your choice).

## V2 (optional)
- **Practice queue / missed-words mini-game:** flashcards that replay the line from Spotify (discussed 2026-10-10: possible by jumping to the line's time and pausing at the next line; no audio is cut or saved).
- A settings menu (volume, lyrics timing, text size, default mode and level).
- Everything from earlier V2 lists.
