# Lyrics Game

A personal Next.js web app: plays a song in the browser from my Spotify Premium account or from YouTube, shows synced lyrics (LRCLIB), hides words and I type or sing them. Desktop browser. Spotify is optional since Phase 13. Since Phase 14 the same code also runs as a web version for friends (`APP_MODE=web`: YouTube only, behind a shared word, data in a free database). Phases 16 (sign in with Google) and 17 (recommendations) are ideas in `plan.md`.

## Where things are
- `lyrics-game/` — the app. Read `lyrics-game/AGENTS.md` first: Next.js 16 has breaking changes; check `node_modules/next/dist/docs/` before writing Next code.
- `spec.md` — the whole project. `plan.md` — the phase roadmap. `Lyrics Game prototype flow-handoff.zip` — the design handoff (screens, copy, colors) the specs and `globals.css` refer to.
- `Output/phase-N-spec.md` (what and why) and `Output/phase-N-plan.md` (checklist) — one pair per phase. `Output/retrospective.md` — lessons so far.
- `lyrics-game/src/lib/` — server logic: `spotify.ts`, `library.ts` (library + on-disk copy), `spotify-block.ts` (rate-limit block), `lyrics.ts` / `lyrics-cache.ts`, `game.ts` (blanks, guesses, scoring), `games.ts` / `progress.ts` / `saved.ts` (my data), `json-file.ts`. YouTube (Phase 13): `youtube.ts` (search, ranking, links, playlists), `video-matches.ts` (the chosen video per song), `own-library.ts` (songs and lists added from YouTube, ids `yt-<video id>`), `track-id.ts`, `local-user.ts` (who you are without Spotify).
- Web version (Phase 14): `app-mode.ts` (the `APP_MODE` switch, `notAvailableInWeb`), `storage.ts` + `database.ts` (files on your computer or Upstash online, same code above), `gate.ts` + `src/proxy.ts` (the shared word), `limits.ts` (daily searches and imports), `list-http.ts` / `own-access.ts` (the list routes). Your own lists are in `own-library.ts` (create, rename, delete, add, remove).
- `lyrics-game/src/app/` — pages and `api/` routes. `src/components/` — shared UI.
- `lyrics-game/.data/` — my data and caches (gitignored, never commit). `.env.local` holds the Spotify keys and `YOUTUBE_API_KEY` (gitignored; only `.env.local.example` is tracked).

## Commands (run in `lyrics-game/`)
- `npm run dev` — dev server on port 3000 (or preview `lyrics-game-dev` from `.claude/launch.json`). Spotify login redirects to `http://127.0.0.1:3000`, so the app runs at that address, not `localhost`.
- `npm run lint` and `npm run build` — both must pass before a step is done.
- `npm test` — rule checks for the game (`src/lib/*.test.ts`, Node's built-in runner, no extra packages). Must pass too. When a game rule changes, update or add a check.

## How we work
- Before building, read the current phase's spec and plan. Build one plan step at a time, tick it in the plan with a short "Done (date): …" note, and commit per step: `Phase N step X: <what it does>`.
- A phase closes only after I play-test it on my real account: `Close Phase N: …`. Then push.
- Spec changes go into the spec (dated), not just the code. Ideas that don't fit go to V2/V3 in the spec, not into this phase. "V2"/"V3" are future features, not git tags.
- Ask before adding a dependency.
- Branch `main`, remote on GitHub. `git push` after commits. GitHub runs lint, tests and build on every push (`.github/workflows/check.yml`); if it fails, fix it before moving on.

## Spotify and outside services
- Keep Spotify requests low: it rate-limits hard (multi-hour blocks). Reuse the on-disk library copy (6 h) and respect the remembered block; never add loops that re-fetch the whole library.
- Spotify's API changes without warning (e.g. playlist `/tracks` → `/items`). When something breaks, check the current docs before assuming our code is wrong.
- LRCLIB sometimes answers 503; lyrics are cached in `.data/lyrics-cache.json`.

## YouTube (Phase 13)
- Official embedded player only: never hide it or cover it (at least 200 px high, the corner player is 356 × 200), never block ads, never download audio. Captions are switched off in code, because they would show the lyrics.
- YouTube refuses to play on a page whose address is a number, so on `127.0.0.1` the player runs in a frame served from `localhost` (`/yt-frame`, see `createPlayer` in `youtubeApi.ts`). Test any YouTube change from `127.0.0.1:3000`, not only `localhost`.
- The free YouTube key allows about 100 searches a day: search only when the user asks, and save every choice. Playlists and link details cost almost nothing.
- "Embeddable" in YouTube's data is only a hint. A video is saved only after it loads in a visible player (`VideoChoices.tsx`).
- Data that one route writes and another reads (video choices, own library) uses `freshJsonFile`, read from the file each time. A copy kept in memory went stale in dev and played the wrong source.
- Without Spotify ("use the app without Spotify" on the start page) only works on `127.0.0.1`/`localhost`; your data stays under the remembered Spotify id.

## Web version (Phase 14) and the library (Phase 15)
- `APP_MODE=web` turns off everything Spotify (those routes answer 404 "not_available") and turns on the shared-word gate (`WEB_GATE_WORD`; no word set means nothing opens). Your own copy is the default and has no limits, no gate and no database. Secrets (`WEB_GATE_WORD`, `UPSTASH_*`, `YOUTUBE_API_KEY`) live only in `.env.local` and in Vercel's settings, never in git or in chat.
- Every file the app reads must have a static path (`path.join(process.cwd(), ".data", ...)`). A path built from an env variable makes Next trace the whole project at build time (a build *warning*, not an error). Read the whole build output, not just a grep for "error".
- Code that `npm test` loads imports siblings with the `.ts` extension (`./storage.ts`). Tests must never touch `.data/`: they `process.chdir` to a temp folder before importing, or use the fake database (`memoryDatabase`).
- Names starting with `use` are taken as React hooks by lint: don't call a plain function `useOne`.
- Vercel: branch deployments ("Preview") are private to my Vercel login and only get the variables ticked for Preview; changing a variable needs a redeploy. Friends use the production address (`main`). GitHub's check runs on every push.
- The library: one add box first (words search, a link adds), then the search, then the tabs Your lists / Saved (and From Spotify in my own copy). `?tab=youtube` still opens Your lists. A list holds song ids, so a song can be in several lists; "Added songs" can be renamed but not deleted.

## Writing style
- UI text, specs, plans and commit messages: plain, short English that a non-developer understands. No jargon in anything the user reads.
- Code: match the surrounding files — small modules in `src/lib`, CSS modules per page, short comments explaining why.
