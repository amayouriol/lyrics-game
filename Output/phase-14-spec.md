# Spec: Phase 14 — A web version you can open from a link (YouTube only)
Date: 2026-10-15
Part of: Lyric Drop (see spec.md for the full project, plan.md for the phase roadmap)
Builds on: Output/phase-13-spec.md (YouTube playback, the From YouTube tab, "Ideas for later")

## Overview
You asked for a public link where the game is playable. Today the game only runs on your computer: it saves everything in files, it needs your Spotify login, and it only opens from your own address. A link anyone can open needs three things the app doesn't have yet: a place to run (hosting), a place to keep each person's games and songs, and a way to stop strangers from using up the free YouTube allowance.

This phase builds a **web version**: YouTube songs only, no Spotify, one link. Your own copy on your computer stays exactly as it is, with Spotify.

## Why not "just share my copy"
- A tunnel to your own computer would put your Spotify login and your data behind a public address. Not recommended.
- Spotify's rules don't allow a public game built on Spotify (see the README), so the web version can't use it at all.

## Scope

### This phase does
1. **Web mode.** One setting (`APP_MODE=web`) turns off everything Spotify: the start page says "Play", there is no From Spotify tab and no Spotify menu. Everything else (game, Type and Sing, results, home, library, From YouTube tab) works as now.
2. **A place to run it.** Free hosting on **Vercel** at an address like `lyric-drop.vercel.app`. You create the account; I prepare the code and the steps.
3. **A place to keep data.** Hosted code can't keep files, so data goes to a free **Upstash Redis** database, called with plain web requests (no new package). The app picks files on your computer and the database online with the same code above it.
   - **Per person:** games, saved songs, added songs and playlists, kept under a random id the app gives each browser (a cookie). No accounts, no email. Clearing the browser's cookies starts a person from zero; there's no sync between devices.
   - **Shared by everyone:** found lyrics, and the chosen video for each song, so a song one friend added is cheap for the next.
4. **A gate.** A shared word ("password") you give your friends, asked once per browser. Without it the link shows only a small "Enter the word" page.
5. **Fair use of YouTube's free allowance.** Each person gets a small daily number of searches and imports (for example 10 and 3). Choices are saved, so repeat songs cost nothing.
6. **Notes.** A short "About and privacy" page: what is kept (a random id, games, songs), that lyrics come from LRCLIB, that videos play in YouTube's own player, and a contact line.

### This phase does not do
- Accounts, emails or logins per person, or syncing between devices.
- Spotify in the web version. Your own copy keeps it.
- A license, payments or ads of its own.
- Make the link findable on search engines (it asks for the word).

## Limits to know (honest list)
- **Lyrics.** LRCLIB lyrics are community-provided, not licensed. Fine for friends; a link on a portfolio that anyone can use is a risk you take. Mitigation: the gate, only the current line is ever shown, and the notes page.
- **YouTube's terms.** Using their search needs the key (yours), a visible official player, and a privacy note. Heavy public use could get the key limited; the daily caps keep it small.
- **Countries.** Some videos can't play in a friend's country; the check before saving catches most, and "Wrong video?" fixes the rest. The cache is shared, so a video that works in your country can fail in a friend's.
- **Ads.** Friends see YouTube's ads; the game waits for them.
- **Cold starts.** The first request after a quiet spell can take a few seconds while the word lists load.
- **Free-tier limits.** Vercel's free plan is for non-commercial use; Upstash's free plan has a daily limit on database requests. Both are plenty for a few friends.

## What you need to do (I can't do these for you)
- Create a **Vercel** account (log in with GitHub) and an **Upstash** account, and paste three values into Vercel's settings page: the database address, its token, and the shared word. I never type passwords or keys for you.
- Pick the shared word.

## Decisions to confirm
1. **Gate or fully open?** Recommended: the shared word. Fully open means anyone on the internet can spend your YouTube allowance and see lyrics.
2. **Where data lives:** the free database (recommended: your friends' games survive, songs are shared) or only in each browser (simpler, nothing to sign up for, but no shared cache and a bigger rewrite of the saving code).
3. **Hosting:** Vercel (recommended, because it builds this kind of app straight from GitHub).
4. **Address:** the free `*.vercel.app` one. A custom domain costs money and isn't needed.

## Success
- A friend opens the link, enters the word, and plays a YouTube song start to finish: lyrics in time, the wait for words, results, saved progress next day on the same browser.
- Nothing Spotify-related shows or runs in the web version; your own copy still works as before (`npm run dev`, Spotify, local mode).
- Lint, tests and build pass; GitHub's check passes; the checks cover the storage switch and the daily caps.
- No keys in the code or in git.
