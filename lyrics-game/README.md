# Lyrics Game

Phase 1: Spotify connection. See `../Output/phase-1-spec.md` and `../Output/phase-1-plan.md` for what this phase does and doesn't cover.

## Setup

1. Create an app at the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. In that app's settings, add this exact Redirect URI:
   ```
   http://127.0.0.1:3000/api/auth/callback
   ```
3. Copy `.env.local.example` to `.env.local` and fill in `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` from the dashboard. `SESSION_SECRET` and `SPOTIFY_REDIRECT_URI` are already filled in — leave them as is for local dev.
4. Install dependencies and run the dev server:
   ```bash
   npm install
   npm run dev
   ```
5. Open **http://127.0.0.1:3000** (not `localhost` — it must match the redirect URI exactly) and click "Connect with Spotify". You'll need Spotify Premium; while the app is in development mode on the dashboard, only accounts you've added under the app's "Users" tab can log in (your own account is added automatically).

## What's implemented

- Login screen, Spotify OAuth (Authorization Code flow), and an encrypted session cookie that keeps you logged in across visits.
- The "denied" screen when you cancel Spotify's consent prompt.
- The library screen: a sidebar of Liked Songs + your playlists with track counts, and the track list for whichever one is selected.
- Retry flows for a failed library/track load, and a session-expired redirect back to login.

Tracks aren't clickable yet, and there's no playable/disabled distinction — both are intentionally out of scope for this phase (see `../Output/phase-1-spec.md`).
