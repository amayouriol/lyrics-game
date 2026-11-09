# Spec: Phase 16 — Sign in with Google
Date: 2026-10-30
Status: closed 2026-11-08 (approved 2026-10-30; the shared word dropped 2026-11-08).

> **Change, 2026-11-08 (your request):** the shared word is dropped. Nobody else is going to find the link, and two steps were one too many. Play now opens a pop-up with only "Sign in with Google". The daily limits (10 searches per person, 80 for everyone) are what protect YouTube's allowance. Decision 1 below and the word step in "What changes for a friend" no longer apply; `WEB_GATE_WORD` is no longer used.

## What and why
In the web version, friends are told apart by a random id in a cookie. Clear the cookies, or open another browser, and their games and lists are gone. With Google sign-in, a friend's data is kept under their Google account, so it follows them to any device.

## What changes for a friend
1. They open the start page. It is open to everyone (no separate "Enter the word" page any more).
2. They click **Play**. If they are not signed in, a **pop-up** opens over the start page (changed 2026-10-30, at your request). Signed in already: Play goes straight to their home.
3. The pop-up has two short steps: the shared word (skipped if this browser already gave it), then "Sign in with Google". One click, Google's own page, and they land on their home.
4. Their data is now theirs: same lists and games on every device.
5. A "Sign out" button sits next to their name.

"Pop-up" means a box over the page, not a separate browser window: pop-up windows get blocked by browsers. Google's own page still opens full-page for the sign-in step and returns to the app.

## What we ask Google for
Name, email and picture only (`openid email profile`). Nothing from YouTube. These are not sensitive scopes, so Google needs no review and anyone with a Google account can sign in.

## Decisions to approve
1. **Shared word stays?** Yes, as the first step in the pop-up. Sign-in is the second step. (Alternative: drop the word and let anyone with Google in. Then anyone on the internet could use up the daily YouTube allowance.) The start page and About stay readable without either; everything else needs both.
2. **Is sign-in required?** Yes in the web version. Your own copy never asks for it.
3. **What happens to data made before sign-in?** The first time a friend signs in on the browser where they already played, their old random-id data moves to their Google account, once. After that the random id is not used.
4. **Who is the user id?** Google's stable account id (`sub`), saved as `g-<sub>`. Not the email, because emails can change.
5. **No new package.** Google's sign-in is a plain redirect plus two web calls, and `iron-session` (already used for Spotify) keeps the signed cookie. Nothing to install.

## What you set up once (I can't do this for you)
- In Google Cloud: an OAuth client of type "Web", with the redirect addresses `https://<your-production-address>/api/auth/google/callback` and, for testing, `http://localhost:3000/api/auth/google/callback`.
- In Vercel: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (secrets live only in `.env.local` and Vercel, never in git or chat).
- Google's consent screen set to "External" and published (otherwise only listed test users can sign in).

## Limits to know
- Vercel preview addresses change per deploy, so Google sign-in is tested on production or on localhost, not on every preview.
- If Google is down, nobody new can sign in; people already signed in keep working until their cookie ends.
- Signing in with a different Google account shows an empty library. That is correct.

## Out of scope
Email/password, other providers, YouTube likes (that is Phase 17), deleting an account.

## Success
- A friend signs in on one browser, adds a song, signs in on another and sees it.
- Clearing cookies and signing in again brings everything back.
- Old random-id data is carried over once, not lost.
- Your own copy behaves exactly as before.
- Lint, tests and build pass; GitHub's check passes.
