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

## Phase 7: Library — spec written 2026-10-03 (Output/phase-7-spec.md)
- [ ] Playlists page as cards (Liked Songs, Favorites, Play later first); each playlist on its own page
- [ ] Search across the whole library and inside a playlist (title and artist)
- [ ] Filters: only playable (on by default), language, genre (best effort), played / not played
- [ ] Favorite and Play later buttons, lists in the library and sections on home

## Explicitly out of scope for this plan
Anything from spec.md's V2 list stays out unless you decide otherwise first: sharing with other people or multi-account login, an unsynced-lyrics fallback mode, score history or leaderboards.

## Before approving this plan
- [ ] Confirm the phase order still makes sense to you
- [ ] Confirm nothing from the v1 scope in spec.md is missing here
- [ ] Confirm nothing from V2 quietly crept into a task above

Reminder for the build itself: if the same kind of error keeps coming up while building a phase, the fix is to correct spec.md (or this plan), not just patch around it in code.
