# Spec: Phase 1 — Spotify Connection
Date: 2026-09-27
Part of: Lyrics Game (see spec.md for the full project, plan.md for the phase roadmap)
Source: refined from the root-level phase-1-spec.md using the screens and copy in the design handoff (`Lyrics Game prototype flow-handoff.zip` → `Lyrics Game.dc.html`)

## Overview
The entry point to the game: connecting your Spotify Premium account and browsing your library (liked songs + playlists). Nothing else in the game works until this is solid — it's the foundation the lyrics pipeline (Phase 2), playback (Phase 3), and game loop (Phase 4) all build on.

## Target users
Same as the main spec: a single user (you), using your own Spotify Premium account.

## Scope

### This phase does
- Show a login screen with a "Connect with Spotify" button when there's no active session.
- Send you through Spotify's own login and consent screen, asking for exactly three things: read your playlists, read your liked songs, play music in this browser.
- Keep you logged in across visits (persisted session), so you don't reconnect every time you open the app.
- Show a header once logged in: the app name, a "Spotify Premium" badge, and a "Log out" button.
- Show your library once logged in: a list of sources (Liked Songs + each of your playlists, each with a track count) in a sidebar, and the track list for whichever source is selected (title, artist, duration, cover).

### This phase does not do
- Play any song (that's Phase 3: Playback).
- Fetch or show lyrics, or distinguish tracks by lyrics availability — in Phase 1 every track in the list looks and behaves the same way. The "greyed out, no synced lyrics" state shown in the design is a Phase 2 concern: Phase 2 adds the lyrics check and re-renders the list with playable/disabled tracks. Phase 1 ships the list without that distinction.
- Do anything when you click a track. Track rows are for browsing only in this phase — no navigation to a setup or playback screen yet. That entry point is added in Phase 2/3 once there's something real to open.
- Support any account other than your own — no multi-user login.

## Expected behavior
1. You open the app without an active session and see the login screen: the app name, a headline ("Finish the line. Your songs this time."), a short description, a "Connect with Spotify" button, and a note that Premium is required and only your account can sign in.
2. You click "Connect with Spotify" and are sent to Spotify's own login and permission screen, which lists exactly what the app is asking for: read your playlists, read your liked songs, play music in this browser.
3. You approve access; the app brings you back in, saves your session, and takes you to your library. The header now shows the app name, a "Spotify Premium" badge, and "Log out".
4. In your library, a sidebar lists your sources — Liked Songs and each playlist, each with a track count — and selecting one shows its tracks (title, artist, duration, cover) in the main panel. Nothing in the list is clickable yet.
5. The next time you open the app, if your session is still valid, you skip the login screen entirely and land straight on your library.
6. If your session eventually expires, you're sent back to the login screen with a banner explaining it ("Your session expired. Reconnect and you'll land right back in your library."), not left stuck.
7. Clicking "Log out" clears your session and returns you to the login screen.

## Errors and safety
- If you cancel or deny the Spotify permission screen, you land on a dedicated screen: "Login is required." with an explanation ("You cancelled the Spotify permission screen, so there's no library to play from. Nothing was saved.") and a "Try again" button that restarts the connect flow. Never a silent failure or a blank screen.
- If Spotify's API fails while loading your playlists or liked songs, the library panel shows a clear error state ("Spotify didn't answer.") with a short explanation and a "Retry" button, instead of an empty or frozen screen.
- Your Spotify credentials and session tokens are stored securely and never exposed to anyone but you.

## Success
You can log in once, close the app, come back later, and land straight on your library without logging in again. Your library correctly lists Liked Songs and every playlist with accurate track counts. If anything about the connection fails along the way — denied permission, expired session, a failed library load — you get a clear message and a way to recover instead of a silent or confusing failure.

## Scope decisions made in this pass
The design handoff shows the full app flow (including later phases), so these three boundaries were decided to keep Phase 1 scoped to "connection + browsing" only, matching plan.md's phase split:
- **Track click:** no-op in Phase 1 (see "This phase does not do").
- **Playable/disabled track state:** not built in Phase 1; arrives with Phase 2's lyrics check.
- **Library sidebar:** full scope — Liked Songs and all playlists with counts, per plan.md's Phase 1 task list.

## V2 (optional)
Nothing deferred for this phase specifically — supporting other people's accounts is covered under the main project's V2 (multi-user login), not here.
