# Plan: Phase 3 — Playback
Date: 2026-10-03
Derived from: Output/phase-3-spec.md. Replaces plan.md's Phase 3 section.
Confirmed scope: in-browser playback (Web Playback SDK, tested on the user's account), play screen with a line counter and the design's player bar, song end returns to the song screen.

## Already done (during the feasibility test)
- [x] Login requests the player permissions (`streaming`, `user-read-email`, `user-read-private`); the session remembers granted scopes
- [x] `GET /api/player/token` hands the browser a short-lived access token plus any missing player permissions; the refresh token stays server-side

## 1. Data for the play screen
- [x] `/api/lyrics/[trackId]` also returns `lineTimesMs` (start time of each lyric line). Timestamps only, never text, so the "no full lyrics" rule holds.
- [x] `POST /api/player/play` `{ deviceId, trackId, positionMs? }` starts the song on this browser's player through Spotify's `PUT /me/player/play`, server-side. Validate ids at the boundary. Retry once on `404` (the new device can take a moment to register). Same session-expired handling as other routes.

## 2. Player (`usePlayer` hook)
- [x] Load Spotify's player script once per page; create one player per play screen; disconnect on leave (stops the music).
- [x] Check permissions first (`missingScopes` from the token endpoint) → "Reconnect Spotify" error.
- [x] Map the player's events to the spec's errors: `account_error` → no Premium; `initialization_error` → browser can't play; `authentication_error` → reconnect; no `ready` within 10s → "player didn't start" with Retry; `autoplay_failed` → "Start the music" button.
- [x] On `ready`, start the song from 0 (and call `activateElement()` where possible).

## 3. Position clock
- [x] Keep `{ positionMs, atTime, paused }` from `player_state_changed`; interpolate between events with `requestAnimationFrame`; re-sync with `getCurrentState()` every second.
- [x] Re-render only when the shown second or the current line changes, not every frame.
- [x] Line counter: count of lines whose start time has passed. 0 → "Get ready. The first line is coming."

## 4. End and drop detection
- [x] Song end: the player reports paused at 0 with this track in `previous_tracks`, or the clock reaches the duration → go back to the song screen.
- [x] Playback dropped: after the song has started, a `null` state (another device took over) or `not_ready` → banner with Resume, which calls `/api/player/play` with the last known position.

## 5. Screens
- [x] Song screen: "Play the song" button under the summary (available songs only), linking to `/library/song/[trackId]/play?from=<list>`.
- [x] Play screen (no header, per the design): "Quit song" (pauses, back to the song screen), the dropped-playback banner, the line counter in the centre, and the sticky player bar at the bottom.
- [x] Player bar per the design's `PlayerBar`: 72px tall, 40px cover, title/artist, round play/pause button (primary-400), elapsed time, progress bar, total time.
- [x] Error panels per the spec, each with a way back to the song screen.

## 6. Cleanup
- [x] Delete the temporary `/playback-test` page.

## Found in testing (2026-10-03)
- "The player didn't start" for every song after the first. First diagnosis (device not registered yet, so retry longer) was wrong: diagnostic logging showed Spotify only ever registers the **first** player a page creates. The app made a new player per song, so every later device id got `404 Device not found` no matter how long it waited, while Spotify kept listing the first one. **Fix:** one shared player per page (`sharedPlayer.ts`), reused for every song; leaving a song pauses it instead of disconnecting; Retry reloads the page (the only way to get a fresh, registrable player). The "not found" retry is back to a short ~3s. Verified on a real account: 4 songs in a row on the same device, each starting in under half a second, one played to the end.
- Another device taking over stopped the music, but the counter kept running and no "dropped" message appeared. **Cause (confirmed by logging on a real account):** the browser player keeps reporting the account's playback, now showing the *other* device's song ("BbY WOW", "Papasito"), not an empty state, and the app ignored states for other songs. **Fix:** once the song has started, a state for a different song pauses the game (or ends it in the last 3s, e.g. Spotify autoplaying the next song). An empty state for two checks in a row is also treated as a drop, as a backstop. The design's small banner became a big centred "Paused: Spotify is playing somewhere else." message with Resume here, at the user's request (spec updated).
- Side effect to know: after you play a song, this browser stays listed as a Spotify device ("Lyrics Game") until the tab is closed.

## Acceptance check (tied to phase-3-spec.md's Success section)
- [x] "Play the song" starts the song in the browser within a few seconds (4 songs in a row, 2026-10-03)
- [x] Elapsed time counts up; the line counter changes as each new line starts (by ear), including after a pause and through to the end
- [x] Pause and resume work
- [x] "Quit song" stops the music and returns to the song screen
- [x] The song's end returns to the song screen
- [x] Starting Spotify on another device mid-song pauses the game (counter frozen, big "Paused" message); Resume here continues from the same spot
- [ ] Opening the play screen by URL (no click) shows "Start the music" if the browser blocks sound. *Not tested: Chrome and Edge allowed sound in every test, so this path hasn't been seen yet.*

## Phase 3 status: done (2026-10-03)
All acceptance items confirmed on a real account except the blocked-sound edge case, which couldn't be triggered.
- [x] `npm run lint` and `npm run build` pass
