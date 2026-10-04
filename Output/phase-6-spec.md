# Spec: Phase 6 — Progress
Date: 2026-10-03
Part of: Lyrics Game (see spec.md for the full project, plan.md for the phase roadmap)
Builds on: Output/phase-4-spec.md (the game and results screen), Output/phase-5-spec.md (game polish)

## Overview
Right now every game is forgotten as soon as you leave the results screen. Phase 6 keeps every song you finish and gives the app a home page that shows your progress: what you played recently, your best songs, the words you keep missing, and your overall numbers. The home page becomes the first thing you see, with a clear way into the library. The missed words are also groundwork for a practice mini-game later.

## Target users
Same as the main spec: a single user (you), using your own Spotify Premium account, on a desktop browser. You play the same songs more than once and want to see whether you're getting better, and which words keep beating you.

## Scope

### This phase does
- **Keep every finished game:** song, difficulty, score, accuracy, best streak, date, and every hidden word with how you did on it.
- **A home page** you land on after logging in, with four sections: Recently played, Best songs, Words you keep missing, and Overall stats.
- **Getting around:** a "Pick a song" button from home into the library, and "Home" / "Library" in the header.

### This phase does not do
- The library changes: playlists first, search, filters, Favorites and Play later (Phase 7).
- The missed-words mini-game (V2). This phase only lists the words.
- Keep games you quit mid-song. Only songs that reach the results screen count.
- Charts of progress over time, achievements, or comparing with other people.
- Delete or edit your history from the app.
- Change anything on Spotify. Your history stays in this app.

## Expected behavior

### Saving games
1. When a song reaches the results screen, the game is saved automatically. Nothing to click.
2. Each play is saved separately, so playing the same song again adds a new game instead of replacing the old one.
3. Quitting mid-song ("Quit song") saves nothing.
4. Your history is still there after closing the browser, after logging out and back in, and on another browser where you log in.

### The home page
5. After logging in (and whenever you open the app), you land on the home page. The header gains "Home" and "Library" links, with the current page marked.
6. At the top: a short greeting and a big **"Pick a song"** button into the library.
7. **Overall stats**, as four stat blocks like the results screen's: songs played (finished games), words guessed (right answers in total), average accuracy (right answers out of all hidden words, across every game), and best streak ever.
8. **Recently played:** your last 5 games, newest first. Each shows cover, title, artist, difficulty, score, accuracy and how long ago ("2 days ago"). Clicking one opens that song's screen. A **"Play again"** button on each starts it straight away at the same difficulty.
9. **Best songs:** your top 5 songs by accuracy. For each song only its best game counts, at whichever level. Ties go to the higher score. Each shows cover, title, artist, the best accuracy and the level it was set at. Clicking opens the song screen.
10. **Words you keep missing:** the 10 words you've missed most often. A word counts as missed when you didn't get it right: wrong, skipped, out of tries or out of time. Getting it right on a later try isn't a miss. Each word shows how often you missed it out of how often it came up ("missed 3 of 4 times") and the song(s) it's from. "Corazón" and "corazon" count as one word. A word only appears after you've missed it at least twice, so one-off slips don't crowd the list.
11. Sections update as soon as you finish a game and return home.

### First time
12. With no finished games yet, home shows a single welcome: "Play your first song to start tracking your progress." with the "Pick a song" button. No empty tables or zeros.
13. With only a few games, each section shows what it has. "Words you keep missing" says "No repeat misses yet. Nice." until a word qualifies.

## Errors and safety
- **Saving fails** (the app can't reach its storage when a song ends): the results screen still shows everything as normal, plus a small note "Couldn't save this game to your progress." with Retry. Leaving without retrying loses only that game.
- **History can't be loaded on home:** the sections are replaced by "Your progress didn't load." with Retry. The "Pick a song" button still works, so you can always play.
- **A song in your history is no longer playable** (removed from Spotify, or its lyrics are gone): it still appears in Recently played and Best songs, but "Play again" is disabled with "No longer available."
- **Session expired:** as in every phase, back to the login screen with the expiry banner.
- **Privacy:** your history is tied to your Spotify login and never shown to anyone else. The lyrics service still only receives song details, never your history.
- The full lyrics are still never shown. The missed-words list shows single words, not lines.

## Success
- Finish three songs (one of them twice, at two levels). Home shows them in Recently played, newest first, with the right scores and accuracy, and each "Play again" starts the right song at the right level.
- Best songs shows that song once, with its better game.
- A word you missed in two games shows in "Words you keep missing" with the right count and song. A word you missed once doesn't.
- Overall stats match what you can count by hand from those games.
- Quit a song mid-way: nothing new shows on home.
- Log out and back in: everything is still there.
- A brand-new account (or empty history) sees the welcome message, not empty sections.

## Scope decisions made in this pass
- **Home first, library second:** you land on home, which leads into the library. Home and library stay separate pages.
- **All four progress sections** in this phase (recent, best, missed words, overall).
- **Finished songs only** count, so quitting a bad start doesn't drag down your stats.
- **Split from the library work:** the library ideas (playlists first, search, filters, Favorites and Play later) became Phase 7, because the "played / not played" filter and the home page's saved lists both need this phase's history.
- **Counts chosen for you** (easy to change): 5 recent games, 5 best songs, 10 missed words, a word listed after 2 misses.
- **Best song** = its best accuracy at any level, not per level, to keep the list short.

## Phase 7 — Library (to spec next)
From the 2026-10-03 interview, for its own spec:
- The library opens on your playlists with their song counts. Click one to see its songs.
- A search bar (title and artist): on the playlists page it searches your whole library, inside a playlist only that playlist.
- Filters: language (English / Spanish, from the lyrics), only playable (hide songs without synced lyrics), genre (best effort: Spotify's artist genres grouped into broad ones, often missing), played / not played (uses this phase's history).
- Two buttons on any song: **Favorite** and **Play later**, each with its own list in the library and on the home page.
- Known constraint (checked 2026-10-03): since February 2026 Spotify only lets this kind of app fetch artists one at a time, and genres exist only on artists, so genre data loads slowly the first time and is incomplete.

## V2 (optional)
- **Missed-words mini-game:** practise the words from "Words you keep missing".
- Progress over time (accuracy per week), achievements, "New best!" on the results screen.
- Delete a game or reset your history.
- **Sing mode** and the other V2 items from Phase 5.
