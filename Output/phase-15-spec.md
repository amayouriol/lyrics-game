# Spec: Phase 15 — A library made for YouTube
Date: 2026-10-22
Part of: Lyric Drop (see spec.md for the full project, plan.md for the phase roadmap)
Builds on: Output/phase-13-spec.md (From YouTube tab), Output/phase-14-spec.md (the web version), Output/phase-7-spec.md (the library)

## Overview
After Phase 14, YouTube is the main source of songs. But the library still treats it as a side tab. A new player opens the library, sees nothing, and has to find the "From YouTube" tab before they can add a first song. This phase turns the library around: adding a song comes first, and the library you build comes below it.

You asked for this on 2026-10-22 after trying the web version.

## Scope

### This phase does
1. **One add bar at the top of the library.** One box where you search a song by name (and artist) or paste a YouTube link (a video or a playlist). Results show three videos to pick from; one click on "Add to your library" and it's there. This is the same add flow as today's From YouTube tab, moved up and made the first thing you see.
2. **No separate From YouTube tab.** In the web version there are no tabs for sources at all. On your own computer, the From Spotify tab stays (and only that one), since Spotify is still there.
3. **Your library below the bar,** in two parts:
   - **Saved:** Favorites and Play later, as today.
   - **Your lists:** the lists that hold your songs. "Added songs" is the default one, and playlists you import appear here too. You can **create a list** and give it a name (for example "Easy English"), **rename** it and **delete** it (the songs stay in your library).
4. **Inside a list:** add songs to it from your library (a picker of the songs you already have) or with the add bar, which then adds straight to that list.
5. **The library search moves down,** to the library part, and only searches what you have added. The add bar is the only search at the top.
6. **First visit.** When the library is empty, the add bar is big and says what to do ("Add your first song"), and shows the same one-line steps as the start page.

### This phase does not do
- Sign-in or recommendations (Phases 16 and 17).
- Sharing a list with other people.
- Changes to the game screens, the song page or how songs play.
- More YouTube searches: the daily limits (web version) stay as they are; the bar shows how many are left.

## Decisions (approved 2026-10-22)
1. **Same layout on your own computer too?** Yes, with the Spotify tab kept next to Saved and Your lists. One layout means less to maintain. (The alternative is a separate layout only for the web version.)
2. **Where does "Added songs" go?** It becomes one of Your lists, the default one new songs go to, so nothing is lost for you or your friends.
3. **Can one song be in several lists?** Yes. A list holds references to songs, like the Spotify lists do.

## Limits to know
- The search bar still costs part of YouTube's free daily allowance (web version: 10 searches a day per person). Pasting a link doesn't.
- Lists made by friends live under each friend's random id, so clearing cookies loses them until sign-in (Phase 16) exists.

## Success
- A new player on the web version lands on the library, sees the add bar first, and adds a song in two clicks (type, then add).
- You can make a list, add three songs to it, rename it and delete it.
- Nothing you had before disappears: favorites, play later, "Added songs" and imported playlists all show.
- Lint, tests and build pass; GitHub's check passes.
