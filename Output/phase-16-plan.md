# Plan: Phase 16 — Sign in with Google
Date: 2026-10-30
Derived from: Output/phase-16-spec.md (draft). Review before building.

## Technical decisions (for you to approve)
- **No new packages.** The sign-in is written by hand in `src/lib/google-auth.ts`: build the Google address (with `state` and PKCE), swap the code for tokens with `fetch`, read the signed ID token from Google's token endpoint (received server-to-server over HTTPS, so it can be trusted without extra libraries), keep only `sub`, name, picture.
- **Where it plugs in.** `getUserId()` in `session.ts` already returns `personId()` in the web version. It will return `g-<sub>` from the signed cookie instead; the rest of the app is untouched.
- **The cookie.** An `iron-session` cookie `lyric_drop_user` (id, name, picture), httpOnly, sameSite lax, secure in production. No Google tokens are kept.
- **The pop-up.** The two Play buttons on the start page (`page.tsx`, hero and "Get started") become a small client component, `PlayButton`, that opens a dialog (native `<dialog>`, focus trapped, Esc closes). Step 1 posts the word to `/api/gate` by fetch (no page reload); step 2 is a link to `/api/auth/google`. Signed in already: it is a plain link to `/home`.
- **The proxy.** `proxy.ts` lets `/` (the start page), `/about`, `/api/gate` and `/api/auth/*` through for anyone. Every other page sends people who lack the word cookie or the user cookie back to `/`; the API answers 401. `/enter` and its page are removed, and `/api/gate` answers JSON for the pop-up.
- **Coming back from Google** lands on `/home`. A failed or cancelled sign-in lands on `/?signin=failed`, which reopens the pop-up with a short message.
- **Moving old data.** A one-time `adoptPerson(oldId, newId)` that copies keys from the random id to the Google id in the storage layer (files and Upstash), skipping if the new id already has data.
- **Branch.** `phase-16` from `main`.

## 0. Before building
- [ ] You approve this plan and the five decisions in the spec.
- [ ] You create the Google OAuth client and give me nothing but the names of the variables set (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) in `.env.local` and Vercel.

## 1. The sign-in logic
- [x] `google-auth.ts`: login address, state + PKCE check, code swap, reading the user. `npm test`: state mismatch refused, expired state refused, missing fields refused (Google faked, no network). Done (2026-10-30): also `web-user.ts` (the signed cookies, key `AUTH_SECRET`, at least 32 characters) and `google-auth.test.ts`, 14 checks.

## 2. The routes and cookie
- [x] `/api/auth/google` (start), `/api/auth/google/callback`, `/api/auth/signout`. `getUserId()` uses the cookie in the web version. Done (2026-10-30): signed out answers the same "session expired" 401 the routes already handle; if the Google keys or `AUTH_SECRET` are missing, sign-in is off (back to the start page), never open.
- [x] `npm test`: signed in gets `g-<sub>`, no cookie gets refused, tampered cookie refused. Done (2026-10-30): covered by the cookie checks in `google-auth.test.ts` (15 checks); `getUserId` itself needs Next's cookies, so it is tried by hand in step 3. Lint and types pass.

## 3. The pages
- [x] `PlayButton` and its pop-up (word step, then Google step; keyboard and screen-reader friendly; works at phone width). Both Play buttons on the start page use it. Done (2026-10-30): built on the native dialog (Esc closes, focus stays inside). Tried in the browser: wrong word, right word, then the Google step. Not yet tried at phone width.
- [x] `/api/gate` answers JSON for the pop-up; the `/enter` page is removed. Done (2026-10-30): old `/enter` links go to the start page. The gate no longer hands out a random id.
- [x] `proxy.ts` as described above; the API answers 401 `session_expired`. Done (2026-10-30): tried with curl: no cookies, word only, a made-up user cookie and a bad sign-in return all end at the start page or 401; a signed cookie opens `/home` with the name in it.
- [x] Name + picture + Sign out in the header. Done (2026-10-30): the account menu now shows in the web version too ("Signed in with Google", Sign out). The About page now says what is kept about a Google account.

## 4. Carry old data over
- [ ] `adoptPerson` on first sign-in when the old random-id cookie exists. `npm test` on both backends (files, fake database): moved once, never overwrites an account that already has data.

## 5. Check and close
- [ ] `npm run lint`, `npm test`, `npm run build` (read the whole build output for warnings).
- [ ] Your play-test: sign in on two browsers, clear cookies and come back, your own copy untouched.
- [ ] Close Phase 16, push, update `CLAUDE.md`, `plan.md` and the retrospective.
