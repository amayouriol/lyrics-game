# Plan: Phase 2 — Lyrics Pipeline
Date: 2026-10-03
Derived from: Output/phase-2-spec.md. Replaces plan.md's Phase 2 section, which assumed Musixmatch.
Confirmed scope: LRCLIB as the lyrics source; every song in the open list is checked automatically; clicking an available song opens the song screen with a lyrics summary (no lyrics text, no difficulty, no playback).

## What we verified about LRCLIB before planning (2026-10-03)
- `GET https://lrclib.net/api/get?artist_name=&track_name=&album_name=&duration=` (duration in seconds). No account or key.
- It matches on duration: asking for "Get Lucky" at 369s returned the 367s album version, at 250s it returned the 248s radio edit. So different versions are stored separately.
- Found → `200` with `duration`, `instrumental`, `syncedLyrics`, `plainLyrics`, `hasWordSync`. Not found → `404` `{"name":"TrackNotFound"}`.
- `syncedLyrics` is LRC text, one line per lyric: `[00:30.64] Like the legend of the phoenix, huh`.
- It exposes a `retry-after` header, so it can answer `429 Too Many Requests`.

And on Spotify's side (after the March 2026 changes): `GET /tracks/{id}` (one track) still works; `GET /tracks?ids=` (several at once) was removed; tracks still include `duration_ms`, `artists`, `album`.

## 0. Before starting (recommended, separate commit)
- [x] Fix the open Phase 1 issue in Output/phase-1-plan.md (playlists use Spotify's removed `/tracks` API). It's in the same file Phase 2 changes first (`spotify.ts`), and without it only Liked Songs can be tested. Phase 2 can still be built and tested on Liked Songs if you'd rather leave it.

## 1. Track data (`src/lib/spotify.ts`)
- [x] Add to each track what the lyrics lookup needs: `durationMs`, `album` name, and `primaryArtist` (the first listed artist; LRCLIB indexes by main artist, Spotify lists featured artists separately). Keep the joined `artist` string for display.
- [x] Add `getTrack(accessToken, id)` using `GET /tracks/{id}`, for the song screen.

## 2. LRCLIB client (`src/lib/lyrics.ts`)
- [x] `lookupLyrics(track)` calls `/api/get` with primary artist, title, album, and duration rounded to seconds. Send a `User-Agent` naming the app. Time out after ~8s.
- [x] Classify every outcome into one of three results:
  - **available:** `200`, not instrumental, non-empty `syncedLyrics`, and returned duration within 2s of Spotify's (our own check on top of LRCLIB's, since this is the spec's wrong-version promise)
  - **unavailable:** `404`, instrumental, no `syncedLyrics`, or duration off by more than 2s
  - **unknown:** network error, timeout, `429`, or `5xx`. Never stored as unavailable (spec: nothing wrongly greyed out).
- [x] Fallback: on a `404` only, retry once with a cleaned title (strip ` - Remastered 2011`, ` - 2003 Remaster`, `(feat. …)`) **and no album**. Tested 2026-10-03: a mismatched album name alone causes a 404, the album parameter is optional, and many remastered titles already match as-is. The duration check still guards against a wrong version.
- [x] Treat `5xx` as `unknown`: a lookup returned `503` once and `200` seconds later, so these are temporary.
- [x] `parseLrc(text)` turns `[mm:ss.xx] text` into `{ timeMs, text }[]`. Drop lines with empty text (instrumental breaks); handle a line with several timestamps (`[00:12.00][01:40.00] chorus`) by emitting one entry per timestamp; sort by time.

## 3. Cache (remember results)
- [x] Store results in a JSON file on the server: `lyrics-game/.data/lyrics-cache.json`, keyed by Spotify track id. Each entry: status, the lookup metadata (title, primary artist, album, duration, cover), `checkedAt`, and for available songs the parsed lines.
- [x] Load the file once into memory; serialize writes so concurrent checks can't corrupt it.
- [x] Never cache `unknown`.
- [x] Add `.data/` to `.gitignore`. The file holds lyrics text, which shouldn't be committed or published.
- [x] Note: this works for a local single-user server. A serverless host would need a real database; out of scope (local only, per Phase 1).

## 4. API endpoints
- [x] `/api/library/tracks` also returns each track's cached lyrics status (`available` / `unavailable` / `unknown`), so revisiting a list is instant (spec step 4).
- [x] `POST /api/lyrics/check` takes a batch of up to 10 tracks (`id`, title, primary artist, album, `durationMs`) and returns a status for each.
  - Requires an active session, so it isn't an open proxy to LRCLIB.
  - Validate input at this boundary: array length ≤ 10, ids match Spotify's 22-character format, bounded string lengths, positive duration.
  - Serve from cache first. Look up misses with at most 3 LRCLIB requests at a time. On a `429`, stop and return the rest as `unknown`.
- [x] `GET /api/lyrics/[trackId]` for the song screen: fetch the track from Spotify (`getTrack`), get lyrics cache-first, and return title, artist, cover, duration, status, and **line count only. Never the lyrics text.** Same session-expired handling as the Phase 1 routes (any Spotify `401` destroys the session).

## 5. Library screen (`LibraryClient.tsx`)
- [x] Heading copy: "Pick a song. Anything without synced lyrics stays greyed out."
- [x] After a list loads, send its `unknown` tracks to `/api/lyrics/check` in batches of 10, one batch at a time, updating rows as each batch returns. Ignore results from a list you've already switched away from. (Keep Phase 1's lint-safe pattern: no `setState` directly in an effect body.)
- [x] Row states, per the design:
  - **checking:** looks like Phase 1, not clickable
  - **available:** "Synced lyrics" tag, clickable, hover highlight, links to the song screen
  - **unavailable:** greyed out, "Lyrics not available" in place of the tag, same text on hover, not-allowed cursor
- [x] Row grid gains the tag column: `28px 48px minmax(0,1fr) auto 48px`.
- [x] If any check comes back `unknown`, show a notice above the list ("Some songs couldn't be checked for lyrics.") with a Retry that re-sends only those.
- [x] Put the selected source in the URL (`/library?source=<id>`) so "Back to library" returns to the same list.

## 6. Song screen (`/library/song/[trackId]`)
- [x] Session guard and header, as on the library page.
- [x] "Back to library" ghost button (to `/library?source=<id>` of the list you came from).
- [x] Cover square with the title over it, then title and artist, per the design's Setup screen.
- [x] States: "Fetching synced lyrics…" while loading; summary line "42 lines · 3:51" when ready; error panel "The lyrics service is having a moment." / "We couldn't fetch synced lyrics for this song. Your library is fine." with Retry; and if the song turns out unavailable (e.g. opened by URL), "Lyrics not available" with the back button.
- [x] No difficulty picker, no "Play the song" button (later phases).

## 7. Explicitly not in this phase
- Showing lyrics text anywhere, or sending it to the browser
- Playback (Phase 3), difficulty and the game itself (Phase 4/5)
- Unsynced-lyrics fallback, re-checking unavailable songs, or overriding a wrong match (V2)
- Musixmatch

## Acceptance check (tied to phase-2-spec.md's Success section)
- [x] Open Liked Songs: without clicking anything, every song ends up tagged "Synced lyrics" or greyed out
- [x] Reopen Liked Songs (and after restarting the dev server): tags appear instantly, with no new LRCLIB requests in the log
- [x] Click a tagged song: song screen shows cover, title, artist and "N lines · m:ss"; the lyrics text is not in the page or in any network response
- [x] Greyed-out songs can't be opened
- [ ] "Back to library" returns to the same list with tags in place
- [ ] Lyrics service unreachable (server side verified 2026-10-03: songs come back unchecked and nothing is cached; the on-screen notice is not yet seen on a real account) (simulate by temporarily pointing the LRCLIB URL at an unreachable host): list shows the "couldn't be checked" notice with Retry and greys nothing out; song screen shows the error panel with Retry
- [x] Spot checks (verified 2026-10-03 via the API against live LRCLIB, plus: a wrong-length version is unavailable, a "(feat. …)" title is found): a well-known song with lyrics is available; an instrumental track is unavailable; a remastered track (title with " - Remastered") is still found
- [x] `npm run lint` and `npm run build` pass

## Confirmed on a real account (2026-10-03)
The five library and song-screen checks above were confirmed by the user.

## Before starting Phase 3
- [ ] Every box above checked against your real account
- [ ] No Phase 3/4 behavior (playback, blanks, difficulty) crept in
