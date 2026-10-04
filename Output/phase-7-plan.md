# Plan: Phase 7 — Library
Date: 2026-10-04
Derived from: Output/phase-7-spec.md. Replaces plan.md's Phase 7 section. Review before building.

Order: the saved lists first (the library cards and buttons need them), then the new library layout, then the buttons, search, filters (cheapest first, genre last since it's the riskiest), and the home sections last.

## Technical decisions (for you to approve)
- **Favorites and Play later are kept like your games:** a JSON file on the server, `.data/saved.json`, under your Spotify user id. Each saved song keeps its title, artist, cover, album and length, so the lists show instantly without asking Spotify, and the lyrics check works on them like any playlist.
- **Addresses stay the same:** `/library` becomes the cards page, and `/library?source=…` (already used by "Back to library" and "Pick another song") becomes a playlist's page. Every existing link keeps working and lands in the right place.
- **Search across the library loads it on the server in one request:** every playlist's songs, each song once. A playlist that fails is reported, not fatal. Kept in the browser until you leave the page.
- **Language is worked out on the server** from the cached lyrics, using the English and Spanish word lists the game already has: whichever language has more words found only in its own list. Remembered per song once worked out.
- **Genres are fetched from Spotify one artist at a time** (the only way allowed since February 2026), a few at a time, and kept in `.data/genres.json`, so each artist is only asked once ever. If Spotify says "slow down", loading pauses and tries again a little later. If it keeps refusing, the Genre chip shows "Genres unavailable right now".
- **Played** comes from your saved games (any finished game of that song).

## 1. Saved lists (`src/lib/saved.ts`, `api/saved`)
- [x] `saved.ts`: `.data/saved.json`, `{ [userId]: { favorites: SavedSong[], later: SavedSong[] } }`, same safe writing as `games.ts` (chained, temporary file then replace, failures reported, unreadable file never overwritten). A `SavedSong` is the track's id, title, artist, primary artist, album, length, cover, and when it was added.
- [x] `GET /api/saved`: both lists, newest first.
- [x] `POST /api/saved`: `{ list: "favorites" | "later", track, on: true | false }`. Adding twice or removing something not there is harmless.
- [x] `POST /api/games` (Phase 6): after saving a game, take that song off Play later. A failure there doesn't fail the save.
- [x] Rule checks: add, add again, remove, remove missing, newest first, finishing a song removes it from Play later only, unreadable file.
- Done 2026-10-04: `src/lib/saved.ts`, `GET`/`POST /api/saved`, and `POST /api/games` now takes a finished song off Play later. The safe file writing moved into a shared `src/lib/json-file.ts`, used by both `games.ts` and `saved.ts`. Changes run one at a time and only take effect once written, so two quick clicks can't lose one. Your existing `games.json` reads unchanged.
- Rule checks: 12 new (saved lists) plus the 35 progress/store and 28 game checks, all pass. Without a login: bad body → 400, valid → 401, nothing written. Lint and build pass.

## 2. Playlists page and playlist pages (`src/app/library/…`)
- [x] `listSources` also returns each playlist's cover (Spotify sends playlist images with the list; no extra requests).
- [x] `/library` with no source: a grid of cards. Liked Songs, Favorites and Play later first (simple tiles: a gradient, a heart, a bookmark), then your playlists with cover and "N songs". The "playlists you only follow" note goes under the grid.
- [x] `/library?source=…`: "All playlists" back button, name, count, the songs as now (including the lyrics check and its outage notice). `source=favorites` and `source=later` read from the saved lists.
- [x] The sidebar goes away. `LibraryClient` splits into a cards view and a playlist view, sharing the song row.
- [x] Error states as now: sources fail → "Spotify didn't answer." with Retry; tracks fail → same panel inside the playlist.
- Done 2026-10-04: `CardsClient` (cards page), `PlaylistClient` (one list's page), shared `TrackList` rows and `useLyricsCheck` (ready for search in step 4). `LibraryClient` removed. Playlist covers come with the list Spotify already sends. `source=favorites` and `source=later` read the saved lists.
- Checked on a throwaway preview with made-up data (deleted): six cards per row at desktop width in the right order, counts ("1 song"), song links keep `?from=` so "Back to library" returns to the list, greyed songs not clickable, a still-checking song turns playable when its check returns, empty Favorites shows its hint, no console errors. Lint and build pass.

### 2b. Side panel for Favorites and Play later (spec change, 2026-10-04)
- [x] Cards: only Spotify lists (Liked Songs, then playlists in Spotify's order). Favorites and Play later leave the grid.
- [x] `SavedPanel` on the right of the cards page and playlist pages: tinted, "Saved in Lyrics Game · Not on Spotify", two sections with counts and their songs (cover, title, artist, opening the song screen with `?from=favorites` / `later`). Section titles open the full pages (`?source=favorites` / `later`), kept for search and filters.
- [x] Hide button → a slim "Saved" tab at the edge. Remembered in the browser (local storage, safely: a blocked or private window just shows the panel).
- [x] A shared `SavedProvider` holds both lists for the library pages, so the panel and the buttons in step 3 stay in step.
- [x] Narrow windows: the panel goes below the songs.
- Done 2026-10-04: `SavedPanel`, `SavedProvider`, shared icons (`src/components/icons.tsx`). The sources list no longer includes Favorites/Play later; their full pages still work by address and from the panel's titles.
- Order (user's question): kept as Spotify gives it (your library order, Liked Songs first). Spotify's "Recents" sort can't be read by apps.
- Checked on a throwaway preview (deleted): panel on the right in its own colour with counts and songs, empty Play later hint, Hide → "Saved" tab, still hidden after a reload, the tab brings it back, on a phone-width window the panel drops below the songs with no sideways scroll. Lint and build pass.

## 3. Favorite and Play later buttons
- [x] Heart and bookmark on every playable song row (not on greyed or still-checking songs), and on the song screen next to "Play the song".
- [x] Clicking changes the button straight away and saves in the background. If saving fails, the button goes back and "Couldn't save. Try again." shows briefly.
- [x] The library loads the saved lists once per visit to know which buttons are filled in.
- [x] Removing a song while viewing Favorites or Play later takes it off that list on screen.
- Done 2026-10-04: `SaveButtons`, `toggle` in `SavedProvider` (changes show at once, are applied over the loaded lists until the server answers, and a late older answer can't undo a newer one). Rows are now a link plus the buttons beside it, not buttons inside a link. The song screen has larger buttons next to "Play the song". The lyrics route now also sends the main artist and album, which a saved song needs for its lyrics check.
- Checked on a throwaway preview with a made-up server (deleted): buttons only on playable songs, the heart fills and the panel updates before the save answers, both stay after it, a failed save goes back with "Couldn't save. Try again." for 3 s, removing a song on the Favorites page takes it off at once. The song screen's buttons weren't previewed (they need a real song); lint and build pass.

## 4. Search
- [x] Inside a playlist: a search box filtering title and artist as you type, ignoring capitals and accents (the game's `normalize`).
- [x] On the cards page: `GET /api/library/all`, every song from Liked Songs and your playlists, each once, plus which playlists failed. Loaded on the first keystroke ("Searching your whole library…"), then kept. The cards are replaced by matching songs while the box has text.
- [x] Search results get the lyrics check for the songs shown (not the whole library), and the same rows, buttons and filters as a playlist.
- [x] "No songs match “xyz”." and, if some playlists failed, "Some playlists couldn't be searched." with Retry.
- Done 2026-10-04: `SearchBox`, `matchesSearch` (the game's `normalize`, so capitals, accents and apostrophes don't matter), search inside `PlaylistClient` ("1 of 4 songs"), `LibrarySearch` on the cards page with `GET /api/library/all` (3 playlists at a time, each song once, Liked Songs first, failed playlists named). The whole-library search waits 250 ms after typing before searching and checking lyrics, so it doesn't check every half-typed word. Search results link to the song screen without a playlist, so "Back to library" returns to the cards.
- Checked on a throwaway preview with a made-up library (deleted): "hawaii" finds the Bad Bunny song inside a list, "xyz" shows the no-match line, "bad bunny" on the cards page shows "Searching your whole library…" then 3 songs and the failed-playlist notice, "dakiti" finds "Dákiti", a second search doesn't load the library again, clearing the box brings back the cards, lyrics are checked only for the songs found. Lint and build pass.

## 5. Filters (chips above the songs, reset per playlist)
- [ ] **Only playable** (on by default): hides songs marked "Lyrics not available". Songs still being checked stay visible until their check finishes.
- [ ] **Played:** Any / Played / Not played. The tracks responses include which songs you've finished (from your games).
- [ ] **Language:** Any / English / Spanish. `dictionary.ts` keeps the two word lists separately as well; `languageOf(lines)` in a new `src/lib/language.ts`. Tracks responses and the lyrics check include each available song's language. Rule checks on a few real songs of each language and a mixed one.
- [ ] **Genre:** first, a quick check with your account that Spotify still returns genres for artists in Development Mode. **If it returns none, I stop and tell you before building the rest.** Then: tracks gain their main artist's id; `POST /api/library/genres` takes artist ids, answers what's already known and fetches a few unknown ones per call (3 at a time), pausing on "slow down"; the page keeps asking until everything visible is known ("Loading genres…"). Spotify's genres are grouped into broad ones by keywords (e.g. "latin", "reggaeton", "urbano latino" → Latin; "pop" → Pop; "hip hop", "rap", "trap" → Hip hop). A song can be in several. Genre chips only list genres present in the current list.
- [ ] Filters combine; the count reads "12 of 42 songs"; "No songs match these filters." with **Clear filters**.

## 6. Home sections (Phase 6 home page)
- [ ] `GET /api/progress` also returns the two saved lists (first 5 each) and, per song, the level you last finished it at.
- [ ] **Play later** and **Favorites** sections between the stats and Recently played, each hidden when empty: cover, title, artist, a **Play** button (your last level for that song, else Medium) and "See all" to its library page.

## 7. Checks
- [ ] `npm run lint` and `npm run build` pass.
- [ ] Rule checks pass (old + new).

## Acceptance check (tied to phase-7-spec.md's Success section)
- [ ] The library opens on cards: Liked Songs, Favorites, Play later first; every playlist shows its song count
- [ ] Inside a playlist, songs without lyrics are hidden until "Only playable" is switched off
- [ ] "hawaii" inside Liked Songs finds the Bad Bunny song; on the cards page it finds it once
- [ ] Spanish + Not played shows only Spanish songs never finished; Played shows only finished ones
- [ ] Some songs get a genre and picking one narrows the list; songs without one still show under Any
- [ ] Favorite one song, Play later another: both show in their library lists and on home; finishing the Play later song removes it; removing the Favorite removes it
- [ ] Log out and back in: both lists still there
- [ ] Old links still work: "Back to library" from a song and "Pick another song" from results land on the right playlist
- [ ] Phase 6's home and the game still work as before

## Before approving this plan
- [ ] The technical decisions above are fine with you
- [ ] You're OK with the genre filter possibly being dropped if Spotify returns no genres (step 5 checks this first)
- [ ] Nothing from the spec is missing, and nothing from V2 crept in
