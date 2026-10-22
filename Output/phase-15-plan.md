# Plan: Phase 15 — A library made for YouTube
Date: 2026-10-22
Derived from: Output/phase-15-spec.md (decisions approved 2026-10-22). Review before building.

## Technical decisions (for you to approve)
- **No new packages.** Lists, the add bar and the picker are built from what is already there (`AddFromYouTube`, `TrackList`, `SavedProvider`).
- **Lists are the app's own lists.** `own-library.ts` already keeps songs once and lists as lists of song ids, so one song can be in several lists (decision 3). New: create, rename, delete, add to a list, remove from a list. "Added songs" is the default list: it can be renamed but not deleted.
- **List ids.** Lists you make get an id like `my-<random>`. Imported playlists (`pl-…`) and "Added songs" keep theirs, so nothing already saved changes shape. The saved files and the database entries stay readable as they are.
- **Same layout everywhere** (decision 1). One library page for your own copy and the web version. Your own copy keeps a **From Spotify** tab next to Saved and Your lists; the web version has no source tabs.
- **The old From YouTube tab goes away.** Links to `?tab=youtube` open Your lists, so no old link breaks.
- **How many searches are left** (web version only): a small read-only call on the counters that already exist. It never counts a use.
- **Branch.** Built on a new branch `phase-15`, started from `phase-14`, so it stacks on the web version. It joins `main` after Phase 14 does.

## 0. Before building
- [x] You approve this plan (2026-10-22). (The three decisions in the spec are approved: same layout everywhere, "Added songs" as a default list, a song can be in several lists.)

## 1. The lists, in the data
- [x] `own-library.ts`: create a list, rename it, delete it (the songs stay in your library), add songs to a list, remove a song from a list. "Added songs" can't be deleted. Done (2026-10-22).
- [x] Two lists can't share a name for the same person (case doesn't matter); a name is trimmed and at most 60 characters. Done (2026-10-22).
- [x] `npm test`: each operation, on both backends (files and the fake database); a song in two lists; deleting a list keeps its songs in the library; old saved data still reads. Done (2026-10-22): `own-lists.test.ts`, 20 checks. The checks work in a temporary folder, never your `.data`.

## 2. The routes
- [x] Create, rename, delete and change a list's songs (`/api/own/lists/...`); `/api/own/add` takes an optional list to add to. Done (2026-10-22): a single song goes into the list as well; a playlist always becomes its own list and ignores it. A wrong list is refused before any YouTube request.
- [x] How many searches are left today (web version), for the add bar. Done (2026-10-22): `/api/own/limits`; reading never uses one up; null in your own copy.
- [x] `npm test`: the answers for a bad name, a list that isn't yours, a song that isn't in your library. Done (2026-10-22): `list-http.test.ts`; 143 checks pass. Tried by hand on your own copy with calls that write nothing (bad names, the default list, unknown lists, a Spotify id).

## 3. The library page: add bar first
- [x] The add bar at the top of the library: one box for a name or a link, the three videos to pick from, "Add to your library". The From YouTube tab is removed; old `?tab=youtube` links open Your lists. Done (2026-10-22): the box tells a link from words by itself (a link adds, words search). The tabs are now Your lists (the default, in both modes), Saved in Lyric Drop and, in your own copy, From Spotify. The library search already sits below the add bar (it moved here early; step 6 only has to check it).
- [x] First visit, empty library: a big "Add your first song" with the one-line steps. Done (2026-10-22): web version only, shown while Your lists is empty. Not seen locally (it needs the real database); to check on the Vercel preview.
- [x] Web version: "N searches left today" under the bar; a clear message when it's zero. Done (2026-10-22): at zero, searching is disabled and the box says pasting a video link still works. To check on the Vercel preview.
- [ ] Checked by hand in both modes (own copy with Spotify, and the web version). Own copy checked 2026-10-22 (the page, the tabs, the old `?tab=youtube` link); the web version waits for the Vercel preview.

## 4. Your lists
- [ ] A tab "Your lists" (default, with Saved) showing "Added songs", imported playlists and your own lists as cards.
- [ ] "New list": a name, then it appears. Rename and delete from the list's page, with a confirmation for delete that says the songs stay.

## 5. Inside a list
- [ ] On a list's page: "Add songs" opens a picker of the songs already in your library (with a filter), and the add bar adds straight to this list.
- [ ] Remove a song from a list (not from the library).

## 6. The library search moves down
- [ ] The library search sits in the library part, and searches only what you added. The add bar is the only search at the top.
- [ ] `npm run lint`, `npm test`, `npm run build` pass; GitHub's check passes.

## 7. Play-test and close
- [ ] Your play-test, own copy: nothing you had disappeared (favorites, Play later, Added songs, imported playlists, Spotify tab).
- [ ] Your play-test, web version: a new player adds a first song in two clicks; makes a list, adds three songs, renames it, deletes it.
- [ ] plan.md gets the Phase 15 result; `Close Phase 15: …` and push.

## Not in this phase
Sign-in, recommendations, sharing a list, and any change to the game screens (Phases 16 and 17, and later).
