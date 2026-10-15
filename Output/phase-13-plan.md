# Plan: Phase 13 — Play songs from YouTube
Date: 2026-10-14
Derived from: Output/phase-13-spec.md. Review before building.

## Technical decisions (for you to approve)
- **No new packages.** YouTube's player script loads from YouTube; the search and playlist calls use plain `fetch` on YouTube's API.
- **You need a free YouTube API key** (Google Cloud console, "YouTube Data API v3"). It goes in `.env.local` as `YOUTUBE_API_KEY`. I'll tell you the steps when we reach step 2.
- **A player layer** in `src/app/library/song/[trackId]/play/`: a shared shape for what the game needs (the same things `usePlayer` returns today). `usePlayer.ts` (Spotify) keeps its code; a new `useYouTubePlayer.ts` returns the same shape. The game picks one by the song's source.
- **Song IDs don't change.** Saved songs and progress stay valid. YouTube matches live in `.data/video-matches.json` (`src/lib/video-matches.ts`, using `json-file.ts`); the app's own list in `.data/own-library.json` (`src/lib/own-library.ts`).
- **Risks to check first** (step 2): how to tell an ad from the song using the player's events; how fast pause and continue are for the line-end wait. If either fails, I stop and tell you before going on.

## 1. Player layer (no visible change)
- [x] Write the shared player shape from what the Type and Sing screens use today.
- [x] Make `usePlayer.ts` match it; the game screens use the shape, not Spotify types.
- [x] `npm test`, lint and build pass; a Spotify song plays exactly as before.
- Done (2026-10-14): new `playerTypes.ts` (the shape: status, errors, controls) and `usePlayback.ts` (the one hook the screens call; Spotify for now). `usePlayer.ts` now returns that shape; `PlayClient.tsx` and `SingScreen.tsx` call `usePlayback`. No behavior changed: lint, 52 checks and build pass. Not tried on a real Spotify song (avoids extra Spotify requests); you'll see it in the Phase 13 play-test.

## 2. YouTube player
- [x] Loading YouTube's player in the corner (320 × 180) with start, pause, continue, position, "ended".
- [~] Ads: the game waits while an ad plays and shows the ad text; the lyrics clock starts when the real song starts. Built, **not seen with a real ad yet** (see note).
- [x] The line-end wait works (pause just before the next line, continue when answered).
- [~] Errors: can't embed, video removed, no internet — clear message ("This video can't be played here."). Built; "pick another" comes with step 3. Not triggered live.
- [x] Try it on one hard-coded video before any matching work.
- Done (2026-10-14): `useYouTubePlayer.ts` (same shape as the Spotify player) and `youtubeApi.ts` (loads YouTube's player, no packages). `usePlayback.ts` uses YouTube when the page address has `?yt=<video id>` (a test link; step 3 replaces it with the saved match), otherwise Spotify. New "ad" status and "video_unavailable" error with texts on both screens. Tried on a temporary page (deleted) with one real video: it plays, the lyrics clock stays within a second of YouTube's, pause and continue work, and the wait before a line holds the clock just before it and continues when released. Lint, 52 checks and build pass.
- Note on ads: the ad check compares the video YouTube reports (its id and length) with the song's. I haven't seen an ad in my tests, so that check is a best guess. When you play-test, if an ad plays and the lyrics start early, tell me: the browser console prints "[youtube] ad detected" when the check fires, and we adjust it.
- Not tried on the real game screens (they need your Spotify login): the corner player's position over the bottom player bar is unchecked.

## 3. Matching songs to videos
- [ ] Search with the title and artist, prefer Topic / auto-generated uploads, skip lyrics-video words, show the top 3 with warnings.
- [ ] Save your pick; "Wrong video" swaps it.
- [ ] Per-song source: YouTube if matched, else Spotify; a setting to force one.
- [ ] `npm test`: title cleaning and the lyrics-video warning words.

## 4. Own library list
- [ ] The app's own list, started from your cached Spotify library (no new Spotify requests).
- [ ] Import a pasted YouTube playlist (public or unlisted).
- [ ] "Add a song": a YouTube link, or a title and artist.
- [ ] Library and playlist pages read from the own list; Spotify playlists still show as before.

## 5. Spotify optional, README, play-test
- [ ] The app opens and plays matched songs without a Spotify login.
- [ ] README: YouTube key step, a short legal note (official player only, no audio downloads, lyrics from LRCLIB, personal project).
- [ ] plan.md gets a Phase 13 section; V2 ideas into spec.md.
- [ ] `npm run lint`, `npm test`, `npm run build` pass; GitHub check passes.
- [ ] Your play-test on your account; then `Close Phase 13: …` and push.
