# Retrospective: my first project built with AI (Lyrics Game)

Written 2026-10-04, from the git history (52 commits, 2026-09-27 → 2026-10-04), the specs/plans in `Output/`, and the code.

## What I built
A personal web app (Next.js) that connects to my Spotify Premium account, plays a song in the browser, shows synced lyrics (from LRCLIB), hides words and makes me type them, with score, progress, a home page, Favorites and Play later. 7 phases, ~67 source files.

## What worked (keep doing)
1. **Spec → plan → build in small steps.** Every phase has a `phase-N-spec.md` (what and why) and `phase-N-plan.md` (checklist). Commits are named "Phase 7 step 3: ...". That made the work easy to follow, resume and undo.
2. **Closing each phase with a real-account check.** "Close Phase 4: acceptance checks confirmed in play-test". Tests on my real Spotify account found things no mock would have.
3. **Writing "what it does NOT do" in the spec** (no multiplayer, no mobile app, no payments). It stopped the scope from growing.
4. **Moving ideas to a later version** (genre filter → V3) instead of squeezing them in.
5. **Small, descriptive commits.** The history reads like a diary of decisions.
6. **Changing the spec when reality changed** (Musixmatch → LRCLIB) instead of forcing the old plan.

## What hurt (and cost the most time)
1. **I built on assumptions about outside services.** Almost all the "Fix ..." commits are the outside world surprising us:
   - Spotify removed/renamed the playlist endpoint (`/tracks` → `/items`).
   - Spotify rate limits (twice: "didn't answer", then "keep requests low").
   - Playback: the player didn't start, only the first song worked, Spotify moved to another device.
   - Musixmatch had to be replaced by LRCLIB.
   - Login bugs (false "Login is required", 401 handling).
2. **The riskiest piece was tested late.** The playback feasibility test came in Phase 3, after the library and lyrics work. If "can the browser play a Spotify song with a line counter?" had been proven in a 1-hour spike on day 1, the rest could have been planned around it.
3. **Repo housekeeping was left behind:**
   - There is **no GitHub remote**. Everything exists only on this computer. A disk problem = lost project.
   - The branch is `master` but the main branch is `main`.
   - Duplicate/old files at the root (`spec.md`, `plan.md`, `phase-1-spec.md`, also in `Output/`) and a `.zip` design handoff committed.
   - No automated tests (I found none). Every check is manual.
   - Claude's project instructions are almost empty (`CLAUDE.md` only says `@AGENTS.md`, which is just the Next.js warning). Claude has to rediscover the conventions each session.

## What to do differently next time
**Planning**
- Start with a **"riskiest assumption" spike**: before the spec is final, list every external service/API the idea depends on and test one real call to each (auth, rate limits, the one hard feature). Put the results in the spec.
- Add a short **"Dependencies and risks"** section to each spec: service, what we rely on, what happens if it changes or limits us.
- Keep one `roadmap.md` as the source of truth; delete or move the old copies.

**Working with Claude**
- Fill in a real `CLAUDE.md`: how to run, build, lint, folder map, naming, "always read the phase spec first", "commit per plan step", "ask before adding a dependency". Short and specific beats long.
- Use **plan mode** for anything bigger than one step, and let Claude ask questions (the `brainstorming` skill for fuzzy ideas, `crear-roadmap` for the order, `crear-specs` for the spec) — you already did this well.
- **One session = one phase/step.** Start a new session at each phase with "read phase-N-spec and plan, do step X". Long sessions get summarized and lose detail.
- Save lessons as **memory** ("Spotify rate limit: copy library to disk, don't re-fetch") so they are not re-learned.
- Use cheaper/faster settings for small edits (copy, styling) and the strongest model + more thinking for architecture, debugging and specs. Check `/fast` and the model picker in the app.
- Use **subagents / code review** on finished phases (`/code-review`, `/security-review`) before closing them. Security matters here: the app handles Spotify tokens.
- Use **hooks/permissions** (`/fewer-permission-prompts`) so routine commands do not interrupt you.

**GitHub**
- Create a **private GitHub repo now** and push. Rename `master` → `main`.
- Work in **branches + pull requests**, one per phase (`phase-8-...`). Even alone, a PR gives a review point (Claude can review it) and a safe rollback.
- Tag finished versions (`v1`, `v2`). The "Close Phase 5 (v1 complete)" commit is a perfect tag.
- Add a simple **GitHub Action** (lint + typecheck + build) so every push is checked automatically.
- Use **Issues** for the backlog (genre filter, ideas) instead of only markdown files; link them from commits ("closes #4").
- Never commit secrets: `.env.local` is ignored, only `.env.local.example` is tracked. Good — keep it so.

**Quality**
- Add a few tests for the pure logic that is easy to break: progress calculation, word hiding/spacing, guess matching, scoring. These are cheap to test and the hardest to re-check by hand.
- Turn each acceptance checklist into a reusable "play-test script" file so the real-account check is repeatable.

## Time and effort: where to save
| Cost | Cause | Saver |
|---|---|---|
| Fix commits for Spotify | Untested assumptions about APIs | Day-1 spike + risks section |
| Re-explaining context | Weak CLAUDE.md, long sessions | Real CLAUDE.md, one phase per session, memory |
| Manual re-checking | No tests | Tests for core logic + play-test script |
| Fear of breaking things | No remote, no PRs | GitHub, branches, tags |
| Scope creep | Nice ideas mid-phase | Keep "later" list (V3), issues |

## What I learned in one paragraph
AI makes writing code fast; the slow, expensive parts are **deciding what to build, knowing what the outside world allows, and checking that it really works**. The habits that paid off were a written spec, small steps, and real-account acceptance tests. The habits to add are testing risky assumptions first, giving Claude durable instructions, and using GitHub as the safety net and review tool.

## Next 5 actions (small)
1. Create a private GitHub repo, rename the branch to `main`, push.
2. Remove the root duplicates (`spec.md`, `plan.md`, `phase-1-spec.md`) and decide whether the `.zip` belongs in the repo.
3. Write a real `lyrics-game/CLAUDE.md` (commands, structure, workflow rules).
4. Add tests for scoring, word hiding and progress.
5. Before Phase 8: spike any new external dependency first, and open the phase as a branch + PR.

## Phase 13 (YouTube) — what went wrong, and what to do next time
Every problem below was found by playing on a real screen, none by lint or tests. Most cost a round trip with you.

| What happened | Cause | Habit to keep |
|---|---|---|
| Every video said "can't be played here" | YouTube refuses pages whose address is a number (127.0.0.1); Spotify's login forces that address | Test the outside service from the address the app really runs on, before building on it |
| A chosen video was ignored and Spotify played | Two parts of the dev server each kept their own copy of the saved matches | Data written by one route and read by another is read from the file, not from memory |
| "Embeddable" videos still failed | YouTube's flag is a hint, not a promise | Check with the real player before saving a choice |
| Captions gave the lyrics away, and came back after a pause | A personal YouTube setting overrides the embed; the module reloads on resume | Re-assert it while playing, and ask the person to test pause and resume |
| The player was 320 × 180, under YouTube's 200-pixel rule | I quoted the rule and then didn't apply it | Re-read a rule against the number just chosen |
| Lists of songs from music videos have swapped names | "Song - Artist" and "Artist - Song" look the same | Topic uploads are clean; a swap button could come later |

What worked: building in small steps (player layer first, then one hard-coded video), a temporary test page for each risky piece (deleted afterwards), and asking for a screenshot at every failure.
