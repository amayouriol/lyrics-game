# Lyrics Game

A personal Next.js web app: connects to my Spotify Premium account, plays a song in the browser, shows synced lyrics (LRCLIB), hides words and I type them. Single user, desktop browser.

## Where things are
- `lyrics-game/` — the app. Read `lyrics-game/AGENTS.md` first: Next.js 16 has breaking changes; check `node_modules/next/dist/docs/` before writing Next code.
- `spec.md` — the whole project. `plan.md` — the phase roadmap. `Lyrics Game prototype flow-handoff.zip` — the design handoff (screens, copy, colors) the specs and `globals.css` refer to.
- `Output/phase-N-spec.md` (what and why) and `Output/phase-N-plan.md` (checklist) — one pair per phase. `Output/retrospective.md` — lessons so far.
- `lyrics-game/src/lib/` — server logic: `spotify.ts`, `library.ts` (library + on-disk copy), `spotify-block.ts` (rate-limit block), `lyrics.ts` / `lyrics-cache.ts`, `game.ts` (blanks, guesses, scoring), `games.ts` / `progress.ts` / `saved.ts` (my data), `json-file.ts`.
- `lyrics-game/src/app/` — pages and `api/` routes. `src/components/` — shared UI.
- `lyrics-game/.data/` — my data and caches (gitignored, never commit). `.env.local` holds Spotify keys (gitignored; only `.env.local.example` is tracked).

## Commands (run in `lyrics-game/`)
- `npm run dev` — dev server on port 3000 (or preview `lyrics-game-dev` from `.claude/launch.json`). Spotify login redirects to `http://127.0.0.1:3000`.
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

## Writing style
- UI text, specs, plans and commit messages: plain, short English that a non-developer understands. No jargon in anything the user reads.
- Code: match the surrounding files — small modules in `src/lib`, CSS modules per page, short comments explaining why.
