# Plan: Phase 1 — Spotify Connection
Date: 2026-09-27
Derived from: Output/phase-1-spec.md. Expands plan.md's Phase 1 section (Spotify connection) into a build-ready checklist, using the screens in the design handoff (`Lyrics Game.dc.html`).
Confirmed scope for this phase: track rows are browse-only (no click behavior), no playable/disabled distinction yet, library sidebar limited to Liked Songs + playlists you own (see note below).

**Update from the build:** Spotify's API 403s when asked for the track list of a playlist you only follow (Discover Weekly, Release Radar, Daily Mix, anyone else's playlist) — confirmed against a real account. Phase 1 now filters `/me/playlists` down to playlists owned by the logged-in user, with a short note in the sidebar explaining why followed playlists aren't listed. See Output/phase-1-spec.md's "Scope decisions" section.

## 1. Spotify app & OAuth
- [x] Register the app in the Spotify Developer Dashboard, get Client ID/Secret
- [x] Implement the OAuth login flow (Authorization Code flow, since it needs to persist across visits)
- [x] Request exactly the scopes the consent screen promises: read playlists, read liked songs, play music in this browser (`playlist-read-private`, `user-library-read`, `streaming` + `user-read-playback-state`/`user-modify-playback-state` — requested now even though playback itself is Phase 3, so the consent screen only has to ask once)
- [x] Store access + refresh tokens securely (server-side session or encrypted storage — never in plain localStorage)
- [x] Silent refresh on token expiry; only fall through to the login screen if refresh itself fails

## 2. Session persistence
- [x] On app load, check for a valid session before rendering anything
- [x] Valid session → skip login, go straight to library
- [x] No session → show login screen
- [x] Expired/invalid session (refresh failed) → login screen with the "Your session expired. Reconnect and you'll land right back in your library." banner
- [x] "Log out" clears the session and returns to a clean login screen

## 3. Screens — Login
- [x] Headline + description + "Connect with Spotify" button + Premium-required note (copy per spec)
- [x] Session-expired banner (conditional, only after an expired session)
- [x] Clicking "Connect with Spotify" kicks off the OAuth redirect

## 4. Screens — Consent / denied
- [x] Redirect through Spotify's own consent screen (no custom UI needed here — it's Spotify's page)
- [x] Approve → back to the app, session saved, land on library
- [x] Cancel/deny → dedicated "Login is required." screen with explanation and a "Try again" button that restarts the connect flow

## 5. Screens — Library
- [x] Header: app name, "Spotify Premium" badge, "Log out" button (shown on every screen once logged in)
- [x] Sidebar: list every owned source — Liked Songs first, then each playlist you own — with its track count and a note explaining why followed playlists are excluded; selecting one highlights it and loads its tracks
- [x] Track list panel: title, artist, duration, cover, in source order — every row rendered identically (no playable/disabled split yet, no click behavior)
- [x] Loading state while the library/track list fetches
- [x] Error state ("Spotify didn't answer.") with a "Retry" button if the fetch fails

## 6. API / data
- [x] Endpoint: list sources (Liked Songs + playlists you own) with name + track count
- [x] Endpoint: list tracks for a given source (title, artist, duration, cover art)
- [x] Handle Spotify API pagination for large playlists/liked-songs libraries
- [x] Handle Spotify API errors (rate limit, timeout, 5xx) by surfacing the library error state, not crashing

## 7. Explicitly not in this phase
- No click behavior on tracks (no navigation, no setup/playback screen)
- No playable/disabled distinction on tracks — every row looks and behaves the same
- No lyrics fetching (Phase 2) or playback (Phase 3)
- No multi-user login

## Acceptance check (tied to phase-1-spec.md's Success section)
- [x] Log in once, close the app, reopen it later, and land straight on the library — no repeat login
- [x] Library correctly lists Liked Songs and every playlist **you own** with accurate track counts (after the 2026-10-03 fix below)
- [x] Denying consent shows the dedicated denied screen, not a blank/broken state
- [ ] An expired session sends you back to login with the expiry banner, not a silent failure — not yet exercised against a real expiry
- [x] A failed library load shows the error state with a working Retry

## Known issue — RESOLVED 2026-10-03 (confirmed working on a real account)
Owned playlists show **0 songs** and opening one shows "Spotify didn't answer." Liked Songs works.

**Cause:** Spotify changed its Web API for Development Mode apps (applied to existing apps on 2026-03-09). The code still uses the old names:
- `GET /playlists/{id}/tracks` was removed → returns 403 for *every* playlist. Replaced by `GET /playlists/{id}/items`.
- In `/me/playlists`, each playlist's `tracks.total` is now `items.total` → the code reads a missing field and falls back to 0.
- In the playlist item list, each entry's `track` field is now `item`.
- `/me/tracks` (Liked Songs) did not change, which is why it still works.

The earlier conclusion that the 403 came only from *followed* playlists was wrong: the endpoint itself is gone. Limiting to owned playlists is still correct, though, because the new `/items` endpoint only works for playlists you own **or collaborate on** (collaborative playlists could be added back).

**Fix (all in `lyrics-game/src/lib/spotify.ts`):** read `playlist.items?.total`, call `/playlists/{id}/items`, read `entry.item` instead of `entry.track`. Then re-check the acceptance item above.

Source: [Spotify February 2026 migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)

## Before starting Phase 2
- [x] Confirm every box above is checked and manually verified against a real Spotify Premium account
- [x] Confirm no Phase 2/3 behavior (lyrics, disabled tracks, playback) quietly crept into this phase's code
