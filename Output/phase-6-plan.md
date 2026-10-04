# Plan: Phase 6 — Progress
Date: 2026-10-03
Derived from: Output/phase-6-spec.md. Replaces plan.md's Phase 6 section. Review before building.

Order: storage and saving first (nothing to show without it), then the progress numbers as pure functions (easy to check), then the home page, then getting around.

## Technical decisions (for you to approve)
- **Where games are kept:** a JSON file on the server, `.data/games.json`, next to the lyrics cache (already git-ignored). It survives closing the browser and logging out, and works from any browser, as the spec asks. A database would be more than a single-player app needs. *Limit: this works while the app runs on your computer (or any server with a disk). If it's ever hosted on a "serverless" platform, games would need a real database. That's a later decision.*
- **Whose games:** each game is stored under your Spotify user id, so a different account would never see your history (and the app already only lets your account in).
- **Each game is saved once:** the results screen gives each game an id, so a Retry or a reload can't save the same game twice.
- **The server works out the numbers:** the browser sends each hidden word's result. The server recomputes score and accuracy with the same rules as the game, so stored numbers can't drift from the rules.

## 1. Who you are (`src/lib/session.ts`, `api/auth/callback`)
- [x] Store your Spotify user id in the session at login (one `/me` request in the callback).
- [x] Sessions from before this phase have no id: fetch `/me` once when needed and save it into the session. If that fails because the session expired, the usual expiry path applies.
- Done 2026-10-03: `getCurrentUserId` (spotify.ts), `userId` in the session, set at login (a failed `/me` doesn't fail the login), and `getUserId()` (session.ts) for route handlers. It fetches and saves the id for older sessions, using the same session object as the token refresh, so it can't overwrite refreshed tokens. Lint and build pass. Nothing uses it yet; step 2 is the first user.

## 2. Saving games (`src/lib/games.ts`, `api/games`)
- [x] `games.ts`: load and save `.data/games.json`, `{ [userId]: Game[] }`. Writes are chained (as in the lyrics cache) and go to a temporary file that then replaces the real one, so a crash mid-write can't corrupt your history. Unlike the lyrics cache, a failed write is reported, not swallowed.
- [x] A `Game`: id, date, song (track id, title, artist, cover, length), difficulty, score, accuracy, correct count, total, best streak, and every hidden word: answer, result (right / wrong / revealed), wrong tries, what you typed.
- [x] `POST /api/games`: checks the body's shape, ignores a game id it already has (answers "saved"), recomputes the numbers (step 3), saves, answers. 401 on an expired session as everywhere else.
- [x] Results screen (`PlayClient.tsx`): when a game reaches results, send it once (the game's id is made when the round starts). If it fails: "Couldn't save this game to your progress." with Retry under the summary. The rest of the screen is unchanged. Quit sends nothing.

## 3. The numbers (`src/lib/progress.ts`, pure functions, used by the server and the rule checks)
- [x] `summarizeGame(words, level)`: score, accuracy, correct, total and best streak from the word results, same rules as `computeStats` (points halve per wrong try; streak counts first-try words only).
- [x] `overallStats(games)`: songs played (finished games), words guessed (right answers), average accuracy (right answers ÷ hidden words across all games, not an average of averages), best streak ever.
- [x] `recentGames(games, 5)`: newest first.
- [x] `bestSongs(games, 5)`: each song's best game at any level (higher accuracy, then higher score), top 5 by the same order.
- [x] `missedWords(games, 10)`: grouped by `normalize` ("Corazón" = "corazon"), shown in the spelling seen most often. Missed = not right (wrong or revealed). Counts "missed N of M times" and the songs. Only words missed 2+ times. Ordered by misses, then miss rate, then alphabetically.
- [x] Rule checks (throwaway script, as before): each function on hand-made games, including ties, accents, a word right in one game and missed in two, and an empty history.
- Done 2026-10-03: `src/lib/progress.ts` (types and numbers), `src/lib/games.ts` (the file), `POST /api/games`, and saving from the results screen.
- Rule checks: 35 new ones (summary, overall, recent, best, missed words, and the file store: duplicate, re-read, corrupt file left untouched, failed write reported and retried), plus the 28 game checks, all pass. Endpoint without a login: bad game → 400, valid game → 401, nothing written. Lint and build pass.
- Not yet seen on a real account: the first game saved will create `.data/games.json`.

## 4. Home page (`src/app/page.tsx` + `HomeClient` or server-rendered sections)
- [x] `/` when logged in shows home instead of redirecting to the library. Logged out: the login screen, as now.
- [x] Greeting and a big **"Pick a song"** button to `/library`.
- [x] Overall stats: four `StatBlock`s, like the results screen.
- [x] Recently played: cover, title, artist, difficulty chip, score, accuracy, "2 days ago" (the browser's own relative time formatting). The row opens the song screen; **Play again** opens the play screen at that level.
- [x] Best songs: cover, title, artist, best accuracy, the level it was set at; opens the song screen.
- [x] Words you keep missing: word, "missed 3 of 4 times", song name(s).
- [x] Empty history: only the welcome ("Play your first song to start tracking your progress.") and the button. A history with no repeat misses: "No repeat misses yet. Nice."
- [x] Can't read the history file: "Your progress didn't load." with Retry (reloads); the "Pick a song" button still shows.
- [x] Styled with the design system already in use (cards, chips, stat blocks); no new design to follow, since the prototype has no home page.

## 5. Getting around
- [x] Header: "Home" and "Library" links, the current one marked. The logo goes to home.
- [x] Login now lands on home (callback redirect, and the expiry banner's "you'll land right back in your library" → "…on your home page").
- [x] Results' "Pick another song" still goes to the library list you came from.

## 6. "No longer available" (spec: Errors and safety)
- [x] Play again is disabled with "No longer available." when the lyrics cache says the song has no synced lyrics.
- [x] *Deviation to approve:* songs removed from Spotify can't be detected without one Spotify request per song on every home visit (Spotify no longer allows fetching several songs at once). Instead, Play again on such a song opens the song screen, which already shows "Spotify didn't answer." with a way back. Cheaper, and these songs should be rare.
- Done 2026-10-03: `GET /api/progress` (the four sections from your games, plus which songs can't be played again), `HomeClient` and `home.module.css`, Header with Home/Library (now a client component, so it can mark the current page), login and the expiry banner pointing home.
- Layout change from the plan: score, accuracy and time go on one line under the artist ("Medium · 1650 pts · 83% · 5 minutes ago"), so Play again fits beside each row. Best songs shows the accuracy big on the right and "Set on Medium" under the artist.
- Checked with made-up games on a throwaway preview page (deleted): full history, empty history (welcome only), load error (panel with Retry), a "No longer available." row, long titles cut with "…", no console errors. Logged out, `/` still shows the login screen and `/api/progress` answers 401.

## 7. Checks
- [x] `npm run lint` and `npm run build` pass.
- [x] Rule checks pass (old + new).

## Acceptance check (tied to phase-6-spec.md's Success section)
- [x] Finish three songs (one twice, at two levels): Recently played shows them newest first with the right scores and accuracy; each Play again starts the right song at the right level
- [x] Best songs shows that song once, with its better game
- [x] A word missed in two games is listed with the right count and song; a word missed once isn't
- [x] Overall stats match a count by hand
- [x] Quitting mid-song adds nothing
- [x] Log out and back in: everything is still there
- [x] Empty history shows the welcome, not empty sections
- [ ] Saving failure shows the note and Retry works (simulated by making the file unwritable for a moment). *Not seen on screen; the store's failed-write-then-retry path passed in the rule checks.*
- [x] Phase 5's game still plays as before

## Before approving this plan
- [x] The technical decisions above are fine with you (file on the server; songs removed from Spotify handled by the song screen)
- [x] Nothing from the spec is missing
- [x] Nothing from Phase 7 (library search, filters, Favorites, Play later) crept in
