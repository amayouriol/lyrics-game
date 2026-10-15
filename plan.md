# Plan: Spotify Lyrics Guessing Game
Date: 2026-09-27
Derived from spec.md — review before building. Ordered to match the roadmap doc (Spotify login → Lyrics data → Playback → Core game loop → Polish).

## Phase 1: Spotify connection — DONE (Output/phase-1-spec.md, phase-1-plan.md)
- [x] Register the app in the Spotify Developer Dashboard, get Client ID/Secret
- [x] Implement the OAuth login flow
- [x] Fetch and list the user's playlists and liked songs
- [x] Handle login errors (expired token, network failure) with a clear message, per spec's error-handling rule

## Phase 2: Lyrics pipeline — DONE (LRCLIB instead of Musixmatch; Output/phase-2-spec.md)
- [x] Sign up for a Musixmatch API key
- [x] Backend endpoint: given a track, fetch synced lyrics with timestamps
- [x] Flag tracks with no synced lyrics available so the picker shows them disabled with a note (spec: "V1 does not do" — no playing songs without synced lyrics)
- [x] Cache the lyrics response per track to avoid repeat API calls

## Phase 3: Playback — DONE (Output/phase-3-spec.md)
- [x] Integrate the Spotify Web Playback SDK
- [x] Confirm Premium-only playback works; handle a non-Premium account with a clear error
- [x] Report playback position at an interval fine enough for word-level timing
- [x] Handle playback errors (SDK disconnect, no active device) with a clear message

## Phase 4: Core game loop — DONE 2026-10-03 (Output/phase-4-spec.md)
- [x] Blank-word selection logic for each difficulty level (Easy, Medium, Hard — all three ship in v1)
- [x] Timing engine: match playback position to lyric timestamps and reveal blanks on time
- [x] Guess input UI and correctness check
- [x] Scoring logic
- [x] End-of-song summary screen (final score, accuracy)

## Phase 5: Game polish — DONE 2026-10-03, v1 complete (Output/phase-5-spec.md, phase-5-plan.md)
Redefined: the original Phase 5 tasks (difficulty selector, song picker disabled state, styling) were already built in Phases 2 and 4.
- [x] 15-second countdown when the song waits for a word, then the word is missed
- [x] Spaced-out hidden words (not the same word again within 8 lines)
- [x] Lyrics that move: lines glide up, karaoke-style sweep across the current line
- [x] Close v1: every error state in spec.md checked on a real account, including the four left untested

## Phase 6: Progress — DONE 2026-10-03 (Output/phase-6-spec.md, phase-6-plan.md)
- [x] Save every finished game (song, difficulty, score, accuracy, streak, each word's result)
- [x] Home page: Recently played, Best songs, Words you keep missing, Overall stats
- [x] Land on home after login; "Home" / "Library" in the header

## Phase 7: Library — DONE 2026-10-06 (Output/phase-7-spec.md, phase-7-plan.md)
- [x] Playlists page as cards (Favorites and Play later in a side panel); each playlist on its own page
- [x] Search across the whole library and inside a playlist (title and artist)
- [x] Filters: only playable (on by default), language, played / not played (genre moved to V3)
- [x] Favorite and Play later buttons, lists in the library and sections on home

## Phase 8: Sing mode — DONE 2026-10-10 (Output/phase-8-spec.md, phase-8-plan.md)
- [x] Step 0: one-hour test of the browser hearing you sing (English, Spanish, whole song, headphones, speed); results into the spec — all four yes (2026-10-08)
- [x] Choose Type or Sing on a song's screen
- [x] Sing hidden lines over the music: slots fill in as heard, points per word
- [x] Results and saved progress for sung games (marked, compared only with sung games)
- [x] After play-testing: easier levels (Easy 1 line in 3, Medium every other, both wait up to 10 s), "oh", "yeah" and names left out

## Phase 9: Lyric Drop — new look for Home, Library and How to play — DONE 2026-10-10 (Output/phase-9-spec.md, phase-9-plan.md)
Design: the Figma Make file "Design main page for game" (code in `design/figma-make/`, not on GitHub). Song and game screens wait for their Figma designs.
- [x] Current streak (songs in a row at 80% or more) and your Spotify name and picture from the login, no new Spotify requests
- [x] New name and top bar with your profile menu
- [x] Home: record with your streak, totals, Recently played, Top performances, Words that keep dropping (practice queue "Coming soon")
- [x] Library: search, Saved in Lyric Drop / From Spotify tabs, Spotify's logo and credit, restyled playlist pages
- [x] How to play page, every number taken from the game's rules
- [x] Your play-test on your account (2026-10-10, all good)

## Phase 10: Lyric Drop look for the song screen — DONE 2026-10-10 (Output/phase-10-spec.md, phase-10-plan.md)
- [x] "Set up your game": real cover, Type / Sing, levels with points, your six level texts with real counts, "Why choose a language?", start button, round heart and bookmark
- [x] Your play-test on your account (2026-10-10, all good)

## Phase 11: Lyric Drop look for the game and results screens — DONE 2026-10-11 (Output/phase-11-spec.md, phase-11-plan.md)
Design by Claude (mockup approved 2026-10-10), with your requests: bigger player bar, only points and streak at the top, line count under the instructions.
- [x] Game screen, Type and Sing: dark stage, points and streak tiles, line count under the instructions, bigger player bar
- [x] Results, Type and Sing: verdict, four tiles, Play again / Try next, your guesses or lines
- [x] Your play-test on your account (2026-10-11, all good)

## Phase 12: Fixes after play-testing — DONE 2026-10-11 (Output/phase-12-spec.md, phase-12-plan.md)
- [x] Harder Type levels (Easy 2 lines in 3, Medium 2 per line, Hard 3–4) and fewer repeated words (Sing unchanged)
- [x] Home: notes closer to the record, bigger totals, "in N songs" on Words that keep dropping
- [x] Your play-test on your account (2026-10-11, all good)

## Phase 13: Play songs from YouTube — DONE 2026-10-15 (Output/phase-13-spec.md, phase-13-plan.md)
Why: Spotify's limits. Spotify still works next to it; removing it was left for later.
- [x] A player layer, with Spotify's player behind it and no visible change
- [x] YouTube's official player (356 × 200, in the corner), with a wait for ads, captions switched off, and a frame on localhost because YouTube refuses numbered addresses like 127.0.0.1
- [x] Match each song to a video once, checked to play before it's saved (Topic uploads preferred, lyrics videos warned, videos blocked in your country left out); "Wrong video?" link
- [x] The app's own song list: a From YouTube tab, add by link, by title and artist, or a whole public playlist
- [x] Spotify optional: "use the app without Spotify" on this computer, the saved copy of your library; README note
- [x] Your play-test on your account (2026-10-15, all good)

## Phase 14: A web version for friends (YouTube only) — planned 2026-10-15 (Output/phase-14-spec.md, phase-14-plan.md)
Why: you asked for a public link. Step 0 is a spike on the risky parts before anything is changed.
- [ ] Spike: word lists, YouTube player, YouTube key and the database all work from a free host
- [ ] Web mode: no Spotify anywhere in the hosted version
- [ ] Storage layer: files on your computer, a free database online, same code above it
- [ ] A person id, a shared-word gate and daily caps on searches
- [ ] Put it online (Vercel + Upstash, you create the accounts); notes page; play-test

## Explicitly out of scope for this plan
Anything from spec.md's V2 list stays out unless you decide otherwise first: sharing with other people or multi-account login, an unsynced-lyrics fallback mode, score history or leaderboards.

## V3 (later than V2)
- Genre filter (see Output/phase-7-spec.md, V3).

## Before approving this plan
- [ ] Confirm the phase order still makes sense to you
- [ ] Confirm nothing from the v1 scope in spec.md is missing here
- [ ] Confirm nothing from V2 quietly crept into a task above

Reminder for the build itself: if the same kind of error keeps coming up while building a phase, the fix is to correct spec.md (or this plan), not just patch around it in code.
