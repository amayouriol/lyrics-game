# Spec: Phase 13 — Play songs from YouTube (Spotify stays for now)
Date: 2026-10-14
Part of: Lyric Drop (see spec.md for the full project, plan.md for the phase roadmap)
Builds on: Output/phase-3-spec.md (playback), phase-7-spec.md (library), phase-4-spec.md and phase-5-spec.md (the game's timing)

## Overview
Spotify limits the app hard (multi-hour blocks) and may limit it more. This phase adds a second way to play songs: the official YouTube player, which is free. The game, the lyrics and your saved data stay the same. Spotify keeps working next to it, so nothing is lost if YouTube turns out worse. Removing Spotify is a later decision, not part of this phase.

Earlier decision (memory, Phase 12): the project stays Spotify-only and personal. **This phase changes that on purpose** (2026-10-14), because of the Spotify limits.

## Scope

### This phase does
1. **A player layer.** The game screens talk to one "player" and don't care which one is behind it. Spotify's player (today's code) moves behind it with no visible change. YouTube becomes the second one.
2. **YouTube player.** The official embedded player, shown small in the bottom-right corner of the game screen (320 × 180 pixels; YouTube's minimum is 200 × 200 and the player may never be hidden or covered). It must support everything the game needs from a player: start, pause and continue, the song's position, "song ended", and the pause before a line while words are still open.
3. **Ads.** Without YouTube Premium in the browser, a short ad can play before a song (rarely in the middle). While an ad plays, the game waits: the lyrics clock does not start and the screen says "A short ad is playing. Your song starts right after." We never block or skip ads.
4. **Matching a song to a video.** For each song, the game finds a YouTube video once, you confirm it, and the choice is saved on disk (`.data/video-matches.json`) forever. Matching prefers:
   - "Topic" uploads and auto-generated ones ("Provided to YouTube by …"): they show only the cover picture, no lyrics, and have clean titles.
   - Skips titles with "lyrics", "lyric video", "karaoke", "letra", "sing along".
   - Shows the top 3 results; any that look like lyrics videos carry a warning. You pick one.
   - A "Wrong video" button in the game picks another match and saves it.
5. **Per-song source.** A song with a saved YouTube match plays from YouTube; otherwise from Spotify if it's available. A setting forces one or the other.
6. **Your own library list.** The app keeps its own list of songs (`.data/`), filled three ways:
   - your cached Spotify library as the starting list (no new Spotify requests);
   - a pasted public or unlisted YouTube playlist link;
   - "Add a song": a pasted YouTube link, or a title and artist (search, top 3, you pick).
   Saved songs and progress keep working: they stay keyed by the same song IDs, and a song's YouTube video is stored next to it.
7. **Spotify becomes optional.** The app opens and plays without logging in to Spotify, as long as a song has a YouTube match.

### This phase does not do
- Remove Spotify code or the Spotify login. (Decided after play-testing, in its own step.)
- A general YouTube search bar. Library search stays inside your list; new songs come in through "Add a song" (V2, below).
- Private YouTube playlists or "Liked videos" (needs a Google login).
- Download or extract audio, hide the player, or block ads. Not allowed by YouTube's terms.
- A website for friends (V2, below).
- Change game rules, points, levels, lyrics or how progress is saved.

## Limits to know
- **Search quota.** The free YouTube key allows roughly 100 searches a day. Matches are saved, so only new songs use it. Reading a playlist costs about 1 unit per 50 songs.
- **Blocked embeds.** Some videos can't be embedded. The game says so and offers another match.
- **Lyrics on screen.** A video with lyrics burned in can't be detected; the warning words catch most, "Wrong video" handles the rest.
- **Lyrics copyright.** LRCLIB lyrics are not licensed; fine for a personal app on your computer, not for a public demo. Same as today.
- **API key.** The YouTube key goes in `.env.local` (gitignored) and `.env.local.example` gets an empty line for it.

## Texts
Plain, short English. New texts: "A short ad is playing. Your song starts right after.", "This video can't be played here. Pick another.", "Wrong video?", "Add a song", "Paste a YouTube link, or type a title and artist."

## Success
- A song with a YouTube match plays in the game on every level and in Type and Sing, the words reveal on time, and the game waits for an ad.
- A Spotify song still plays exactly as before.
- Logging out of Spotify (or being blocked) doesn't stop a matched song from playing.
- A playlist pasted from YouTube, and a song added by hand, both appear in the library and can be played.
- `npm test` covers the title cleaning and the lyrics-video warning words; lint, tests and build pass.
- You play-test on your real account: a Spotify song, a YouTube song, a song with an ad, a "Wrong video" swap.

## Ideas for later (not this phase)
- **V2: a friends' version.** A hosted website with YouTube only (no Spotify), per-friend data (browser storage or a free database), a shared password, the same saved matches for everyone, and a legal note in the README. Needs its own phase.
- **V2: a general search bar** in the library, if "Add a song" isn't enough.
- **V2: remove Spotify** once YouTube feels good.
- **V2: only songs with synced lyrics** when adding (filter before they're saved).

## Scope decisions made in this pass (2026-10-14)
- **YouTube's official embed only.** No audio downloading.
- **Library is the app's own list**, not a YouTube playlist; playlists are one way to fill it.
- **Spotify stays, step by step,** so the app never stops working.
- **Small player in the corner,** 320 × 180 to start; can grow to 480 × 270 after play-testing.
