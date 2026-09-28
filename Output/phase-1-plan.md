# Plan: Phase 1 — Spotify Connection
Date: 2026-09-27
Derived from: Output/phase-1-spec.md. Expands plan.md's Phase 1 section (Spotify connection) into a build-ready checklist, using the screens in the design handoff (`Lyrics Game.dc.html`).
Confirmed scope for this phase: track rows are browse-only (no click behavior), no playable/disabled distinction yet, full library sidebar (Liked Songs + all playlists with counts).

## 1. Spotify app & OAuth
- [ ] Register the app in the Spotify Developer Dashboard, get Client ID/Secret
- [ ] Implement the OAuth login flow (Authorization Code flow, since it needs to persist across visits)
- [ ] Request exactly the scopes the consent screen promises: read playlists, read liked songs, play music in this browser (`playlist-read-private`, `user-library-read`, `streaming` + `user-read-playback-state`/`user-modify-playback-state` — requested now even though playback itself is Phase 3, so the consent screen only has to ask once)
- [ ] Store access + refresh tokens securely (server-side session or encrypted storage — never in plain localStorage)
- [ ] Silent refresh on token expiry; only fall through to the login screen if refresh itself fails

## 2. Session persistence
- [ ] On app load, check for a valid session before rendering anything
- [ ] Valid session → skip login, go straight to library
- [ ] No session → show login screen
- [ ] Expired/invalid session (refresh failed) → login screen with the "Your session expired. Reconnect and you'll land right back in your library." banner
- [ ] "Log out" clears the session and returns to a clean login screen

## 3. Screens — Login
- [ ] Headline + description + "Connect with Spotify" button + Premium-required note (copy per spec)
- [ ] Session-expired banner (conditional, only after an expired session)
- [ ] Clicking "Connect with Spotify" kicks off the OAuth redirect

## 4. Screens — Consent / denied
- [ ] Redirect through Spotify's own consent screen (no custom UI needed here — it's Spotify's page)
- [ ] Approve → back to the app, session saved, land on library
- [ ] Cancel/deny → dedicated "Login is required." screen with explanation and a "Try again" button that restarts the connect flow

## 5. Screens — Library
- [ ] Header: app name, "Spotify Premium" badge, "Log out" button (shown on every screen once logged in)
- [ ] Sidebar: list every source — Liked Songs first, then each playlist — with its track count; selecting one highlights it and loads its tracks
- [ ] Track list panel: title, artist, duration, cover, in source order — every row rendered identically (no playable/disabled split yet, no click behavior)
- [ ] Loading state while the library/track list fetches
- [ ] Error state ("Spotify didn't answer.") with a "Retry" button if the fetch fails

## 6. API / data
- [ ] Endpoint: list sources (Liked Songs + playlists) with name + track count
- [ ] Endpoint: list tracks for a given source (title, artist, duration, cover art)
- [ ] Handle Spotify API pagination for large playlists/liked-songs libraries
- [ ] Handle Spotify API errors (rate limit, timeout, 5xx) by surfacing the library error state, not crashing

## 7. Explicitly not in this phase
- No click behavior on tracks (no navigation, no setup/playback screen)
- No playable/disabled distinction on tracks — every row looks and behaves the same
- No lyrics fetching (Phase 2) or playback (Phase 3)
- No multi-user login

## Acceptance check (tied to phase-1-spec.md's Success section)
- [ ] Log in once, close the app, reopen it later, and land straight on the library — no repeat login
- [ ] Library correctly lists Liked Songs and every playlist with accurate track counts
- [ ] Denying consent shows the dedicated denied screen, not a blank/broken state
- [ ] An expired session sends you back to login with the expiry banner, not a silent failure
- [ ] A failed library load shows the error state with a working Retry

## Before starting Phase 2
- [ ] Confirm every box above is checked and manually verified against a real Spotify Premium account
- [ ] Confirm no Phase 2/3 behavior (lyrics, disabled tracks, playback) quietly crept into this phase's code
