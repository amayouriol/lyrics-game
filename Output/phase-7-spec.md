# Spec: Phase 7 — Library
Date: 2026-10-03
Part of: Lyrics Game (see spec.md for the full project, plan.md for the phase roadmap)
Builds on: Output/phase-2-spec.md (the library and lyrics check), Output/phase-6-spec.md (saved games and the home page)

## Overview
With 179 liked songs and a dozen playlists, it's easy to get lost in the library. Phase 7 makes it easy to find a song. The library opens on your playlists as cards. Inside a playlist you can search and filter by language, genre and whether you've played a song, and songs you can't play are hidden by default. One search box finds a song across your whole library. Two new lists, **Favorites** and **Play later**, let you keep songs at hand, in the library and on the home page.

## Target users
Same as the main spec: a single user (you), using your own Spotify Premium account, on a desktop browser. You know roughly what you want to play ("something in Spanish I haven't played", "that Bad Bunny song") but scrolling a long list to find it is tiring.

## Scope

### This phase does
- **Playlists first:** the library opens on a grid of playlist cards. Click one to see its songs on their own page.
- **Search:** across your whole library from the playlists page, or within one playlist.
- **Filters:** only playable (on by default), language, genre (best effort) and played / not played.
- **Favorites and Play later:** a button for each on every song, two lists in the library, and two sections on the home page.

### This phase does not do
- Change anything on Spotify. Favorites are not Spotify likes, and nothing is added to or removed from your playlists.
- List playlists you only follow, or collaborative playlists (V2).
- Sort songs (by name, artist, date added) or remember your filters between visits (V2).
- Search by lyrics. Search looks at song titles and artists only.
- Any change to the game or to Phase 6's progress sections.

## Expected behavior

### The playlists page
1. "Library" (from the header or "Pick a song" on home) opens a grid of cards. Each card shows a cover, a name and a song count ("179 songs").
2. **Liked Songs** comes first, then your playlists in the order Spotify gives apps (your library's own order). If your Spotify app sorts by "Recents", the order will differ: Spotify doesn't let apps read that sort. Only Spotify lists are cards. Favorites and Play later live in the side panel (below), so they're never mistaken for Spotify playlists.
2b. **The side panel:** on the right of every library page, a tinted panel titled "Saved in Lyrics Game" (with "Not on Spotify" underneath). It has two sections, **Favorites** and **Play later**, each with its count and its songs listed (cover, title, artist; click to open the song). Each section's title opens its full page, with the same search and filters as a playlist. A button hides the panel down to a small "Saved" tab at the edge, and the app remembers whether you hid it. On narrow windows, the panel goes below the songs. *(Changed 2026-10-04 at the user's request: Favorites and Play later were cards in the grid, which made them look like Spotify playlists.)*
3. A short note under the grid explains why playlists you only follow aren't there, as now.
4. A **search box** at the top searches your whole library (see Search).

### Inside a playlist
5. Clicking a card opens that playlist's page: a "All playlists" back button, its name, a count ("42 songs"), a search box, the filter chips, and the songs.
6. Songs look as they do now (cover, title, artist, length, "Synced lyrics" tag), and are checked for lyrics in the same way when the page opens. Each playable song also has a **heart** (Favorite) and a **bookmark** (Play later).
7. The back button returns to the playlists page.

### Search
8. **Inside a playlist:** typing in the search box narrows the list as you type, matching title or artist. Capitals and accents don't matter ("hawaii" finds "LO QUE LE PASÓ A HAWAii").
9. **On the playlists page:** typing searches every song in Liked Songs and all your playlists. The cards are replaced by matching songs, each listed once even if it's in several playlists. The first search may take a few seconds while your whole library loads ("Searching your whole library…"). After that, it's instant until you leave the page.
10. Clearing the search box brings the cards back.
11. Nothing matches: "No songs match “xyz”."

### Filters
12. Above the songs (in a playlist, or on search results), a row of chips:
    - **Only playable**, on by default: songs without synced lyrics are hidden. Switching it off shows them, greyed out as now.
    - **Language:** Any / English / Spanish. Worked out from each song's lyrics. A song whose lyrics haven't been checked yet, or that has none, only shows under Any.
    - **Genre:** Any, plus the broad genres present in the list (e.g. Pop, Rock, Hip hop, Latin, Electronic, R&B, Indie, Country). Spotify gives genres per artist, so a song takes its main artist's genres and can be in more than one. Songs whose artist has no genre only show under Any. The first time, genres fill in gradually ("Loading genres…"). After that they're remembered.
    - **Played:** Any / Played / Not played, from your saved games.
13. Filters combine (e.g. Spanish + Not played + Latin). The count reads "12 of 42 songs".
14. Filters reset to the defaults when you open another playlist.
15. Nothing left after filtering: "No songs match these filters." with **Clear filters**.

### Favorites and Play later
16. Clicking the heart adds the song to **Favorites**, and the heart fills in. Clicking again removes it. The bookmark works the same for **Play later**. Both buttons also appear on the song screen.
17. Only playable songs get the buttons.
18. **Favorites** stay until you remove them. **Play later** songs leave that list by themselves once you finish them (when they reach the results screen). Quitting mid-song keeps them on the list.
19. Both lists show newest first, in the side panel and on their full pages (opened from the panel's section titles), which have the same search and filters as a playlist.
20. **On the home page:** two sections, **Play later** and **Favorites**, up to 5 songs each, newest first, each with a Play button (Medium, or the level you last played it at) and a "See all" link to the list in the library. A section with no songs is hidden.
21. Your Favorites and Play later lists are kept with your progress: still there after logging out, and on another browser.

## Errors and safety
- **Search can't load some playlists:** results come from the playlists that did load, with a notice "Some playlists couldn't be searched." and Retry.
- **Genres can't be loaded** (Spotify refuses or limits the requests): the Genre chip shows "Genres unavailable right now" and is disabled. The other filters still work. Nothing is greyed out or hidden because of it.
- **Saving a Favorite or Play later fails:** the button goes back to how it was and a short message says "Couldn't save. Try again."
- **A saved song becomes unplayable** (lyrics gone, or removed from Spotify): it stays in the list, greyed out like any unavailable song. You can still remove it.
- **Spotify session problems:** as in every phase, back to the login screen with the expiry banner.
- **Privacy:** your Favorites and Play later are kept with your progress, never sent to Spotify or the lyrics service.

## Success
- The library opens on cards: Liked Songs first, then your playlists, each with its song count. Favorites and Play later show in the side panel, not as cards. Hiding the panel sticks after a reload.
- Open a playlist: songs without lyrics are hidden until you switch off "Only playable".
- Search "hawaii" inside Liked Songs finds the Bad Bunny song. On the playlists page, the same search finds it once, even if it's in several playlists.
- Spanish + Not played shows only Spanish songs you've never finished. Played shows only songs you have.
- At least some songs get a genre, and picking one narrows the list. Songs without a genre still appear under Any.
- Favorite a song and add another to Play later. Both appear in the side panel and on home. Finish the Play later song: it leaves the list. Remove the Favorite: it leaves too.
- Log out and back in: Favorites and Play later are still there.

## Scope decisions made in this pass
- **Cards** for the playlists page, Liked Songs first, then Spotify's order.
- **Favorites and Play later in a side panel** on the right, visibly "Saved in Lyrics Game", hideable (user's request after seeing the first version, 2026-10-04).
- **Buttons on every playable song row and on the song screen.** Play later empties itself as you finish songs; Favorites only change when you change them.
- **Filters as chips**, "Only playable" on by default, all reset per playlist.
- **Both lists on home**, hidden when empty.
- **Genre kept, best effort** (user's choice after hearing the cost): since February 2026, Spotify only lets this kind of app fetch artists one at a time, and many artists have no genre or very specific ones. They're grouped into broad genres and loaded gradually, and a song without one is never hidden under Any.
- **Search is titles and artists only.** Searching lyrics would mean fetching lyrics for every song first.

## V2 (optional)
- Genres from a better source than Spotify's artist genres.
- Collaborative playlists (Spotify allows reading those).
- Sorting, and remembering filters between visits.
- Syncing Favorites with Spotify likes.
- Everything from earlier V2 lists (sing mode, missed-words mini-game, …).
