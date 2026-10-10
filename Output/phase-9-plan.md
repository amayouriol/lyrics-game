# Plan: Phase 9 — Lyric Drop: new look for Home, Library and How to play
Date: 2026-10-10
Derived from: Output/phase-9-spec.md. Review before building.

Order: the two new pieces behind the screens first (current streak, your name), checked by `npm test` where they're rules. Then the top bar, which every page shares, then Home, Library and How to play, one per step.

## Technical decisions (for you to approve)
- **No new packages.** The fonts (Archivo Black, DM Sans) and the dark-and-purple colors are already in the app since the Codex landing page; the design's colors go into the shared color settings in `globals.css`, so every page uses the same ones.
- **Design reference:** the published Figma page. If you download the Make code (`</>` → Download) into `design/figma-make/`, I read it for exact sizes, and only read it: it's a different kind of app, so nothing is copied in as is. `design/` is ignored by git, so its ~90 images stay off GitHub.
- **Current streak** is a new rule in `src/lib/progress.ts` with checks in `progress.test.ts`: count back from the latest finished game while accuracy ≥ 80%. Worked out from the games already saved, so it's right from day one, nothing to convert.
- **Your name and picture** are read from the Spotify profile answer the login already gets (`getCurrentUserId` becomes `getCurrentUser`, returning id, name and picture) and kept with your login. No new Spotify request.
- **Profile menu** is a small piece of its own in `src/components/`, opened by the round button; closes on outside click or Esc.
- **How to play text** lives in one file next to the page, and the numbers in it (points, tries, seconds, lines) come from the game's own rules in `game.ts` / `sing.ts` where they're already named, so the page can't drift from the game.
- **Spotify's logo:** the official file from Spotify's brand page, saved in `public/`. I'll ask before downloading it.

## 1. Current streak (`progress.ts`) and its checks
- [x] `currentStreak(games)`: songs in a row at 80% or more, counting back from the latest; typed and sung both count; 80% exactly counts.
- [x] Sent to the home page with the other totals (`/api/progress`).
- [x] `npm test` checks: no games → 0; latest under 80% → 0; three at 80%+ then one under → 3; 80% exactly counts; sung and typed mixed in play order.
- Done 2026-10-10: `currentStreak` and `STREAK_ACCURACY = 80` in `progress.ts`, 2 new checks (48 in all), `currentStreak` in the `/api/progress` answer (not shown on screen until step 4). On your real games it's 1: Te Busco 89%, then Rude 79% ends it. Lint, tests and build pass.

## 2. Your name and picture from the login
- [x] At login, keep your Spotify display name and picture with your login (same request as now).
- [x] The home page and top bar can read them; missing → no name, initials or a person icon.
- [x] Check: watch the requests while logging in, still one profile request.
- Done 2026-10-10: `getCurrentUserId` became `getCurrentUser` in `spotify.ts` (id, name, and the smallest picture at least 64 px wide), saved with your login in the callback and in `getUserId`'s fallback; `getProfile(session)` in `session.ts` reads them with no request. Checked in the code: logging in still makes exactly one profile request, the same as before. Seeing your name needs steps 3–4 and one log out and in. Lint, tests and build pass.

## 3. Name and top bar
- [ ] "Lyric Drop" in the browser tab, the denied page and "Saved in Lyric Drop".
- [ ] New top bar: logo, Home · Library · How to play (purple underline on the current page), profile button with menu (name, Spotify Premium, Log out).
- [ ] The song and game screens get the new top bar and nothing else.

## 4. Home
- [ ] Greeting, title and Pick a song; first-time version kept.
- [ ] Your progress panel: the record with the current streak, the five totals beside it.
- [ ] Recently played with Play again; Top performances; Words that keep dropping with the greyed "Start practice queue · Coming soon".
- [ ] Favorites and Play later removed from home (they're in the Library, step 5).
- [ ] Error and loading states as now, restyled.

## 5. Library
- [ ] Top: "Your music", "Find your next song.", search box.
- [ ] Tabs: Saved in Lyric Drop (Favorites, Play later, empty message) and From Spotify (Liked Songs and playlists, with Spotify's logo and credit).
- [ ] Playlist pages, search results and filters restyled, working as before.

## 6. How to play
- [ ] New page at `/how-to-play` with the intro, three steps, Good to know.
- [ ] Type / Sing switch with each mode's levels, rules and score text, exactly as in the spec.

## 7. Checks and play-test
- [ ] `npm run lint`, `npm test`, `npm run build` pass; GitHub check passes.
- [ ] Compared side by side with the published Figma page at desktop size.
- [ ] Play-test on your account: log out and in, see your name; play a song, check the streak and Play again; open both library tabs; read How to play in both modes; the song and game screens unchanged.
- [ ] plan.md gets a Phase 9 section; close with `Close Phase 9: …` after your play-test.
