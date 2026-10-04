# Spec: Phase 2 — Lyrics Pipeline
Date: 2026-10-03
Part of: Lyrics Game (see spec.md for the full project, plan.md for the phase roadmap)
Builds on: Output/phase-1-spec.md (Spotify connection + library)
Screens and copy: the library rows and the song ("Setup") screen in the design handoff (`Lyrics Game.dc.html`)

## Overview
Phase 2 finds out which of your songs the game can be played with. A song is playable only if it has **synced lyrics**: the full lyrics with a timestamp on every line. The library marks each song as available or greyed out. Clicking an available song opens a song screen confirming its lyrics are ready. Phase 3 (playback) and Phase 4 (the game) both depend on these timestamped lyrics.

**Lyrics source: LRCLIB**, a free, community-built lyrics database. It replaces Musixmatch from spec.md, whose free plan only returns about 30% of a song's lyrics and no timing. LRCLIB's lyrics are contributed by its community, so some songs (usually less popular ones) won't have them. Those songs show as unavailable.

## Target users
Same as the main spec: a single user (you), using your own Spotify Premium account.

## Scope

### This phase does
- Check every song in the list you're viewing for synced lyrics, and mark each one: a "Synced lyrics" tag if it's available, or greyed out with "Lyrics not available" if it isn't.
- Remember those results, so reopening a list (or a song) shows its status immediately instead of checking again.
- Open a song screen when you click an available song: cover, title, artist, a "Back to library" button, and a summary line like "42 lines · 3:51" confirming the lyrics are ready.

### This phase does not do
- Show the lyrics. The main spec's rule stands: the app never shows a song's full lyrics at once, only word by word as the song plays (Phase 4).
- Play any song (Phase 3), or include the difficulty picker and "Play the song" button on the song screen (Phase 4/5).
- Offer a fallback for songs without synced lyrics, such as plain unsynced lyrics (V2 in spec.md).
- Re-check songs already marked unavailable, in case lyrics get added later (V2 below).
- Fix playlists showing 0 songs. That's the open Phase 1 issue in Output/phase-1-plan.md; until it's fixed, Phase 2 can be tried on Liked Songs.

## Expected behavior
1. You open a list (e.g. Liked Songs). The songs appear right away, as in Phase 1, and the heading reads "Pick a song. Anything without synced lyrics stays greyed out."
2. While a song is still being checked, it shows "Checking…" and can already be opened: the song screen fetches its own lyrics, and says "Lyrics not available" if there are none. *(Changed 2026-10-04 at the user's request: checking 30 search results took long, and every song was locked until its check came back. It used to be unclickable until checked.)*
3. As each check finishes, the song updates: available songs get a "Synced lyrics" tag and become clickable; unavailable songs turn grey with "Lyrics not available" and stay unclickable (hovering shows the same note).
4. The next time you open that list, every song already shows its status. Nothing is checked again.
5. You click an available song. The song screen opens with its cover, title, and artist. While the lyrics load, it shows "Fetching synced lyrics…".
6. Once they've loaded, the screen shows the summary line ("42 lines · 3:51"). No lyrics text is shown.
7. "Back to library" returns you to the list you came from, with every song's status still in place.

## Errors and safety
- **Wrong-version protection:** lyrics are only accepted if they match the song's length (within 2 seconds). If LRCLIB's best match is another length or has no timing, its other versions of the song (other albums, compilations) are searched for one that fits. Only a song with no fitting version anywhere (live, remix, radio edit) shows as unavailable rather than playing with out-of-sync lyrics. *(Search through other versions added 2026-10-04: "Sacrifice" by Elton John was rejected for a 308 s match, 2.2 s longer than Spotify's 305.8 s, while LRCLIB had a 305 s version. Songs marked unavailable before this are checked once more.)*
- **Instrumentals:** songs listed as instrumental, or found with lyrics but no timestamps, show as "Lyrics not available."
- **Lyrics service down while checking a list:** songs that couldn't be checked are **not** marked unavailable, since that would be wrong. They stay in the unchecked state, and a short notice above the list says some songs couldn't be checked, with a "Retry" button.
- **Lyrics service down on the song screen:** the screen shows "The lyrics service is having a moment." / "We couldn't fetch synced lyrics for this song. Your library is fine." with a "Retry" button, never a blank or frozen screen.
- **Spotify session problems** (expired or revoked) behave exactly as in Phase 1: back to the login screen with the expiry banner.
- Nothing about your account is sent to the lyrics service. It only receives the song's title, artist, album, and length.

## Success
Open Liked Songs and, without clicking anything, every song ends up either tagged "Synced lyrics" or greyed out. Reopen it and the tags are there instantly. Click any tagged song and you get its song screen with a line count and duration, and never see its lyrics. Greyed-out songs can't be opened. If the lyrics service is unreachable, you get a clear message with Retry, and no song is wrongly greyed out.

## Scope decisions made in this pass
- **Lyrics source:** LRCLIB instead of Musixmatch (free, no account or key, timing on every line). Line-level timing is enough because the game hides words within the line that's currently playing.
- **When to check:** the whole list, as soon as it opens, matching the design. Slower on a first visit to a big list, instant afterwards.
- **Song click:** opens the song screen with the lyrics summary. Difficulty and Play arrive in later phases.

## V2 (optional)
- Re-check songs marked unavailable after some time, since LRCLIB's community keeps adding lyrics.
- A way to report or override a wrong lyrics match for a specific song.
