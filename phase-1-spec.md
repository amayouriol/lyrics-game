# Spec: Phase 1 — Spotify Connection
Date: 2026-09-27
Part of: Spotify Lyrics Guessing Game (see spec.md for the full project)

## Overview
The entry point to the game: connecting your Spotify Premium account and browsing your library. Nothing else in the game works until this is solid — it's the foundation the lyrics pipeline and playback phases both build on.

## Target users
Same as the main spec: a single user (you), using your own Spotify Premium account.

## Scope

### This phase does
- Let you log in with your Spotify Premium account through Spotify's own login screen.
- Keep you logged in across visits, so you don't have to reconnect every time you open the app.
- Show your playlists and liked songs once you're logged in.

### This phase does not do
- Play any song (that's Phase 3: Playback).
- Fetch or show lyrics (that's Phase 2: Lyrics pipeline).
- Support any account other than your own — no multi-user login.

## Expected behavior
1. You open the app without an active session and see a login screen with a "Connect with Spotify" button.
2. You click it and are sent to Spotify's own login and permission screen.
3. You approve access; the app brings you back in, remembers your session, and shows your playlists and liked songs.
4. The next time you open the app, if your session is still valid, you skip the login screen entirely and go straight to your library.
5. If your session eventually expires, you're sent back through the same login flow, not left stuck.

## Errors and safety
- If you cancel or deny the Spotify permission screen, you land on a clear message explaining that login is required, with a button to try again — never a silent failure or a blank screen.
- If Spotify's API fails while loading your playlists or liked songs, you see a clear error message, with an option to retry, instead of an empty or frozen screen.
- Your Spotify credentials and session tokens are stored securely and never exposed to anyone but you.

## Success
You can log in once, close the app, come back later, and land straight on your library without logging in again — and if anything about the connection fails along the way, you get a clear message instead of a silent or confusing failure.

## V2 (optional)
Nothing deferred for this phase specifically — supporting other people's accounts is covered under the main project's V2 (multi-user login), not here.
