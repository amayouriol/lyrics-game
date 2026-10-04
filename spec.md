# Spec: Spotify Lyrics Guessing Game
Date: 2026-09-27

## Overview
A personal web app where you pick a song from your own Spotify library (Premium), listen to it in full inside the app, and guess the words it hides from the lyrics as they come up, timed to the second with the music. It's for a single user (you) — a personal take on LyricsTraining, connected to your real Spotify library instead of a separate video catalog.

## Target users
One person: you, using your own Spotify Premium account. Nothing today lets you play this way with your own songs — LyricsTraining uses its own video catalog, not your actual Spotify library.

## Scope

### V1 does
- Log in with your Spotify Premium account and browse your playlists and liked songs.
- Play the chosen song in full inside the app, with synced lyrics appearing line by line.
- Guess the hidden words at three difficulty levels (Easy, Medium, Hard) and see your score at the end of the song.

### V1 does not do
- Multiplayer, leaderboards, or sharing results with other people.
- Playing songs with no synced lyrics available (they show up in the list but disabled).
- Other people's accounts — it's tied to your one Spotify Premium account, no multi-user login.
- A native mobile app — web browser only.
- Payments or in-app purchases.

## Expected behavior
1. You open the app and it asks you to log in with your Spotify account.
2. You see your playlists and liked songs; you pick a song and a difficulty level.
3. The song starts playing in full; the lyrics appear line by line as it plays.
4. When a word you need to guess comes up, you see a blank where you type your answer before that line moves on.
5. If you guess right, the word is revealed and you score points; if you miss, it's revealed anyway and the game continues.
6. When the song ends, you see your final score and how well you did.

## Errors and safety
- If a song has no synced lyrics available (on LRCLIB, which replaced Musixmatch in Phase 2), it shows up in your list but disabled, with a note (e.g. "lyrics not available"), so you know why you can't play it.
- If Spotify or the lyrics service fails momentarily, the app shows a clear message instead of freezing or going blank.
- Your Spotify credentials and the lyrics-service connection are handled privately; no one but you can log in to this build.
- The app never shows a song's full lyrics at once — it only reveals words as the song reaches them.

## Success
You can log in, pick a song from your library, listen to it in full, guess words at all three difficulty levels, and see a final score at the end — all without the app breaking, freezing, or losing sync with the music.

## V2 (optional)
- Sharing the app with friends, or support for other people to log in with their own Spotify accounts.
- A fallback mode for songs with no synced lyrics (e.g. unsynced lyrics as a backup).
- A history of past scores, per-song or per-artist stats, or some kind of personal leaderboard.
