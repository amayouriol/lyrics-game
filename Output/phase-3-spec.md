# Spec: Phase 3 — Playback
Date: 2026-10-03
Part of: Lyrics Game (see spec.md for the full project, plan.md for the phase roadmap)
Builds on: Output/phase-2-spec.md (lyrics pipeline and song screen)
Screens and copy: the play screen ("PLAY") and player bar in the design handoff (`Lyrics Game.dc.html`)

## Overview
Phase 3 plays the chosen song in full, inside the browser, and keeps track of where the song is, down to a fraction of a second. On screen, a line counter ("Line 3 of 42") advances in time with the music. It shows no lyrics, but it proves the timing is right before Phase 4 builds the game on top of it.

**Feasibility checked first (2026-10-03):** Spotify's in-browser player was tested with your account before this spec was written: the song played, the position counted up, and pause/resume worked. A March 2026 forum report said the player stopped working for development-mode apps; it didn't apply here.

## Target users
Same as the main spec: a single user (you), using your own Spotify Premium account, on a desktop browser.

## Scope

### This phase does
- Add a "Play the song" button to the song screen, which opens the play screen and starts the song from the beginning, in the browser.
- Show the play screen: a "Quit song" button, a line counter that advances with the music, and a player bar at the bottom with the cover, title, artist, elapsed and total time, and a play/pause button.
- Handle playback problems with clear messages: no Premium, a browser that can't play Spotify, the player not starting, and playback dropping mid-song.

### This phase does not do
- Show lyrics, hide words, take guesses, keep score, or offer difficulty levels (Phase 4/5).
- Seek, skip, change volume in the app, or queue songs. Your computer's volume controls still work.
- Play on another device, such as your phone or the Spotify desktop app. The music plays in this browser only.
- Show a results screen when the song ends (Phase 4). For now, the end of the song returns you to the song screen.

## Expected behavior
1. On the song screen of a song with lyrics, a "Play the song" button appears below the "42 lines · 3:51" summary.
2. You click it. The play screen opens and briefly shows "Getting the player ready…", then the song starts from the beginning.
3. If Spotify was playing somewhere else on your account (phone, desktop app), it stops there and continues here. That's how Spotify works with one account.
4. Before the first lyric line, the screen says "Get ready. The first line is coming." From then on, the counter shows "Line 3 of 42", changing at the moment each new line starts.
5. The player bar shows the elapsed time counting up against the total. Its play/pause button pauses and resumes the music, and the counter pauses with it.
6. "Quit song" stops the music and returns to the song screen.
7. When the song ends, you return to the song screen, where "Play the song" starts it again.
8. Leaving the play screen any other way (back button, closing the tab) stops the music.

## Errors and safety
- **No Premium:** "Spotify Premium is required to play songs here." with a button back to the song screen. Spotify no longer tells apps up front whether an account is Premium, so this appears when the player refuses to start.
- **Browser can't play Spotify songs** (it lacks the copy protection Spotify requires): "This browser can't play Spotify songs. Try Chrome, Edge or Firefox." with a button back.
- **Player doesn't start** within about 10 seconds: "The player didn't start." with Retry and a button back. Never an endless "getting ready".
- **Login missing the playback permissions** (a login from before Phase 3): "Reconnect Spotify to allow playback." with a button that takes you through Spotify's permission screen again.
- **Playback dropped mid-song** (Spotify started playing on another device, or the connection to Spotify was lost): the design's banner, "Playback dropped. Spotify lost the connection to this browser.", with Resume, which continues from where it stopped.
- **Browser blocks sound** despite your click: a "Start the music" button appears, since browsers only allow sound after you click something.
- **Spotify session problems** behave as in Phases 1 and 2: back to the login screen with the expiry banner.
- **Privacy:** the browser player needs a short-lived pass to Spotify (valid about an hour). Only that pass reaches the browser; the login itself stays on the server.

## Success
Pick a song with lyrics, click "Play the song", and hear it start in the browser within a few seconds. The elapsed time counts up, and the line counter changes as each new line starts (judged by ear), before the first line, after a pause, and through to the end. Pause and resume work. "Quit song" and the song's end both return to the song screen. With another device taking over mid-song, the "Playback dropped" banner appears and Resume continues from the same spot.

## Scope decisions made in this pass
- **Where the music plays:** in the browser (Spotify's Web Playback SDK), confirmed working with your account before speccing. The fallback (music playing in your Spotify app, controlled remotely) wasn't needed.
- **Play screen content:** player bar plus a line counter, no lyrics, so the timing can be checked before Phase 4.
- **Song end:** back to the song screen; Phase 4 replaces this with the results screen.

## V2 (optional)
- Play on another device (Spotify Connect) as an alternative to the browser.
- A volume slider and seeking within the song.
