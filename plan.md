# Plan: Spotify Lyrics Guessing Game
Date: 2026-09-27
Derived from spec.md — review before building. Ordered to match the roadmap doc (Spotify login → Lyrics data → Playback → Core game loop → Polish).

## Phase 1: Spotify connection
- [ ] Register the app in the Spotify Developer Dashboard, get Client ID/Secret
- [ ] Implement the OAuth login flow
- [ ] Fetch and list the user's playlists and liked songs
- [ ] Handle login errors (expired token, network failure) with a clear message, per spec's error-handling rule

## Phase 2: Lyrics pipeline
- [ ] Sign up for a Musixmatch API key
- [ ] Backend endpoint: given a track, fetch synced lyrics with timestamps
- [ ] Flag tracks with no synced lyrics available so the picker shows them disabled with a note (spec: "V1 does not do" — no playing songs without synced lyrics)
- [ ] Cache the lyrics response per track to avoid repeat API calls

## Phase 3: Playback
- [ ] Integrate the Spotify Web Playback SDK
- [ ] Confirm Premium-only playback works; handle a non-Premium account with a clear error
- [ ] Report playback position at an interval fine enough for word-level timing
- [ ] Handle playback errors (SDK disconnect, no active device) with a clear message

## Phase 4: Core game loop
- [ ] Blank-word selection logic for each difficulty level (Easy, Medium, Hard — all three ship in v1)
- [ ] Timing engine: match playback position to lyric timestamps and reveal blanks on time
- [ ] Guess input UI and correctness check
- [ ] Scoring logic
- [ ] End-of-song summary screen (final score, accuracy)

## Phase 5: Polish
- [ ] Difficulty selector UI
- [ ] Song picker UI, including the disabled state for songs without synced lyrics
- [ ] Basic styling and layout
- [ ] Pass over every error state in the spec's "Errors and safety" section and confirm each shows a clear message, not a crash or blank screen

## Explicitly out of scope for this plan
Anything from spec.md's V2 list stays out unless you decide otherwise first: sharing with other people or multi-account login, an unsynced-lyrics fallback mode, score history or leaderboards.

## Before approving this plan
- [ ] Confirm the phase order still makes sense to you
- [ ] Confirm nothing from the v1 scope in spec.md is missing here
- [ ] Confirm nothing from V2 quietly crept into a task above

Reminder for the build itself: if the same kind of error keeps coming up while building a phase, the fix is to correct spec.md (or this plan), not just patch around it in code.
