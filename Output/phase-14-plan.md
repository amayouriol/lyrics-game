# Plan: Phase 14 — A web version for friends
Date: 2026-10-15
Derived from: Output/phase-14-spec.md. Review before building.

## Technical decisions (for you to approve)
- **No new packages.** The database is called with `fetch` (Upstash's web API).
- **One storage layer.** `json-file.ts` (and the lyrics cache) get two backends, files and database, chosen by `APP_MODE`. Every route above them stays as it is. Per-person data is stored under that person's id (one database key per person and kind of data), not in one big file.
- **Person id.** `getUserId()` already decides whose data it is. In web mode it returns a random id kept in a cookie. Spotify, the local-mode cookie and the remembered Spotify id stay for your own copy.
- **The gate** is a middleware-style check: no cookie with the right word, no pages and no `/api` routes (only the "Enter the word" page).
- **Same code, two modes.** A single setting, `APP_MODE=web`, switches. Default stays your own copy.
- **Known risk from reading the code:** the word lists (about 11 MB) are read from `node_modules` by path at runtime. Hosted functions may not include them; that's what Step 0 checks.

## 0. Spike (before any change to the app) — one afternoon, stop if something fails
A tiny throwaway deploy that proves the four risky things:
- [x] The word lists load on Vercel (2026-10-20): yes, no extra setting needed. Both lists loaded and answered ("hello", "corazón" real, a nonsense word not).
- [x] YouTube's player plays from the `*.vercel.app` address (2026-10-20): the player loaded directly, with no frame, and the timer moved.
- [x] The YouTube key works from Vercel's servers (2026-10-20): the lookup came back with the right video, embeddable.
- [x] A write and a read to Upstash from a Vercel function (2026-10-20): the value written was read back, a match.
- Report what worked and what each cost in seconds, before Step 1.

## 1. Web mode
- [x] `APP_MODE=web` switch; in web mode, no Spotify on the start page, library tabs, menu, or routes (they answer "not available"). Done (2026-10-20): `src/lib/app-mode.ts`; eight Spotify routes answer 404 "not_available"; whole-library search returns only added songs; no session in web mode.
- [x] Start page for the web version ("Play", the how-it-plays strip, a YouTube-only note). Done (2026-10-20): "/" is the start page, Play leads to the new "/home" (chosen with you); How to play has YouTube wording.
- [x] Checks: in web mode no Spotify code path runs. Done (2026-10-20): `app-mode.test.ts` (switch, 404 answer, every Spotify route checks it). Also tried by hand with `APP_MODE=web`: pages load, Spotify routes answer 404. A temporary "web" person id stands in until Step 3.

## 2. Storage layer
- [x] Database backend for the saved files (games, saved songs, added songs, saved video choices) behind the same `read` and `update`. Done (2026-10-20): `storage.ts` (files or database by `APP_MODE`), `database.ts` (Upstash by plain requests). Your files keep their shape: your 17 games and added song still read as before. Added songs are now per person, so the add/lists/lyrics routes pass the person's id.
- [x] Lyrics cache and word-language cache in the database, one key per song. Done (2026-10-20): `lyrics:<id>` and `language:<id>`; a database that doesn't answer just means songs are checked again.
- [x] `npm test`: both backends answer the same way (the database one against a small fake). Done (2026-10-20): `storage.test.ts` runs every check on both; `web-data.test.ts` checks per-person and shared data. 99 checks pass.

## 3. Person id, gate and fair use
- [ ] Random person id in a cookie in web mode; every route uses it.
- [ ] The shared-word gate, with an "Enter the word" page and a "wrong word" message.
- [ ] Daily caps per person on searches and imports; a clear message when used up ("Come back tomorrow").
- [ ] `npm test`: the gate and the caps.

## 4. Put it online (you do the accounts)
- [ ] Steps for Vercel and Upstash in the README, with the three values to paste.
- [ ] I check the live link with you: start page, the word, a song, the corner player, saving, "Wrong video?".

## 5. Notes, play-test, close
- [ ] "About and privacy" page, linked from the footer and the gate page.
- [ ] A friend's play-test (or yours from a private window): a full song, a second day.
- [ ] `npm run lint`, `npm test`, `npm run build` pass; GitHub's check passes.
- [ ] plan.md gets the Phase 14 result; `Close Phase 14: …` and push.
