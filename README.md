# Lyric Drop

A personal lyrics-training game. Pick a song from your own Spotify library or from YouTube, listen to it in the browser, and fill in the words that drop out of the lyrics as they're sung.

- **Type mode**: type the hidden words before the line moves on.
- **Sing mode**: sing the hidden lines out loud; the game listens through your microphone.
- Three levels (Easy, Medium, Hard), a score at the end of each song, and a list of the words you keep missing.

Lyrics come from [LRCLIB](https://lrclib.net), a free lyrics service. Songs without timed lyrics show up in your library but can't be played.

> **Personal project.** This runs on your own computer with your own accounts. It isn't a public website, and Spotify's rules don't allow publishing games built on Spotify. Please keep your copy personal too.

## Where the music comes from

- **Spotify** (needs Premium): your Liked Songs and playlists, played through Spotify's own player.
- **YouTube** (free): songs and playlists you add by pasting a link or searching a title. They play in YouTube's official embedded player, shown small in the corner of the game. A short ad can play first, and the game waits for it.

You can use either one, or both. The app never downloads audio from YouTube, never hides its player and never blocks its ads: that's against YouTube's terms, and it isn't needed.

## What you need

- **Spotify Premium**, if you want to play your Spotify library. Songs only play in the browser with Premium. Without it, you can still play songs from YouTube.
- **Node.js 24** ([nodejs.org](https://nodejs.org)) and **Git** ([git-scm.com](https://git-scm.com)).
- **A desktop browser**: Chrome, Edge or Firefox. Sing mode needs Chrome or Edge, because it uses the browser's speech recognition.
- About 20 minutes for the first setup.

## Setup (once)

### 1. Get the code

```bash
git clone https://github.com/amayouriol/lyrics-game.git
```

This creates a `lyrics-game` folder, and the app lives in another `lyrics-game` folder inside it. Every command below runs from there:

```bash
cd lyrics-game/lyrics-game
```

### 2. Create your own Spotify app

Each person needs their own Spotify keys. They're free.

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), log in with your Spotify account and click **Create app**.
2. Give it any name and description.
3. Under **Redirect URIs**, add exactly:
   ```
   http://127.0.0.1:3000/api/auth/callback
   ```
4. Under **Which API/SDKs are you planning to use?**, tick **Web API** and **Web Playback SDK**.
5. Save. In the app's **Settings**, copy the **Client ID** and the **Client secret**.

### 3. Get a free YouTube key (to find and add YouTube songs)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and log in with a Google account. Google asks for 2-step verification on the account first.
2. Create a project (any name).
3. Open **APIs and services**, then **Library**, search for **YouTube Data API v3** and click **Enable**.
4. Open **Credentials**, click **Create credentials**, then **API key**. Under **API restrictions**, limit it to **YouTube Data API v3**. Leave application restrictions on "None".
5. Copy the key.

The key is free. Searching uses part of a small daily allowance (about 100 searches a day), and the app remembers every choice, so only new songs use it. Pasting a link or a playlist costs almost nothing.

### 4. Add your keys

In the `lyrics-game` folder, copy `.env.local.example` to a new file named `.env.local`, then fill it in:

```
SPOTIFY_CLIENT_ID=your Client ID
SPOTIFY_CLIENT_SECRET=your Client secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback
YOUTUBE_API_KEY=your YouTube key
SESSION_SECRET=a long random text
```

(Using only YouTube? The Spotify lines can stay empty.)

For `SESSION_SECRET`, this command prints a random one you can paste:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`.env.local` holds your private keys. Never share it or upload it anywhere (git already ignores it).

### 5. Install

```bash
npm install
```

## Play

```bash
npm run dev
```

Then open **http://127.0.0.1:3000** in your browser and click **Connect with Spotify**, or **Or use the app without Spotify** to play YouTube songs only. Use `127.0.0.1`, not `localhost`, or the Spotify login won't come back to the app.

To add YouTube songs, open **Library**, then the **From YouTube** tab: paste a video or a public (or unlisted) playlist link, or type a title and artist and pick one of three videos. Without Spotify connected, the **From Spotify** tab still shows the last saved copy of your library, and you can connect Spotify any time from the menu at the top right.

Leave the terminal open while you play. To stop, press `Ctrl + C` in it. Next time, just run `npm run dev` again.

## Good to know

- **Who can log in.** Your Spotify app starts in test mode: only you can log in. To let someone else use *your* copy, add their name and Spotify email in the dashboard under **User Management** (up to 5 people).
- **Spotify limits requests.** If the app asks too often, Spotify blocks it for a few hours. The app keeps a copy of your library for 6 hours and remembers a block, so it won't keep asking. If you see "Spotify is limiting this app until…", wait until that time.
- **Your data stays on your computer.** Games, saved songs and caches are kept in `lyrics-game/.data/`, which is created on first use and never uploaded. Delete it to start fresh.
- **Lyrics and videos.** Lyrics come from LRCLIB, a community service, and are shown only as the game needs them. On YouTube, the game prefers "Topic" uploads (the cover picture and nothing else), warns about lyrics videos (which would give the words away) and turns YouTube's captions off. Some videos, mostly from big labels, can't be played outside YouTube; the app checks before it saves one and asks you to choose another.
- **Without Spotify** the app only opens from this computer's own address (`127.0.0.1`). Anyone else on your network can't use it that way. For friends, use the web version above.
- **If Spotify plays on another device** (your phone, for example), the game pauses. Press play in the app to bring it back.

## A web version for friends (optional)

You can also put a copy online that your friends open from a link. It is **YouTube only** (Spotify's rules don't allow a public game built on it), it asks for a **shared word** you give your friends, and each friend's games and songs are kept apart under a random id in their browser. Your own copy on your computer stays as it is.

It runs free on two services. You create the accounts yourself; nothing is paid.

### 1. A free database (Upstash)

1. Sign up at [upstash.com](https://upstash.com) and choose the free plan.
2. Create a **Redis** database and pick the region closest to your friends.
3. Open the database and find the **REST API** section. Keep two values: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (the normal read-and-write token).

### 2. A place to run it (Vercel)

1. Sign up at [vercel.com](https://vercel.com) with GitHub and choose the free **Hobby** plan (for personal, non-commercial use).
2. **Add New → Project**, pick this repository, and set **Root Directory** to `lyrics-game`.
3. Before the first deploy, open **Environment Variables** and add these five. Type them yourself; never put them in the code or in git:

| Name | Value |
| --- | --- |
| `APP_MODE` | `web` |
| `WEB_GATE_WORD` | the shared word you choose (case doesn't matter) |
| `YOUTUBE_API_KEY` | your YouTube key (step 3 of the setup above) |
| `UPSTASH_REDIS_REST_URL` | from Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | from Upstash |

4. Click **Deploy**. Vercel gives you an address like `your-project.vercel.app`. Open it: you should see **Enter the word**. Send friends the link and the word, separately.

### Good to know about the web version

- **Without the word nothing opens.** If `WEB_GATE_WORD` is missing, the site stays locked. To lock everyone out and ask for a new word, change it in Vercel (**Settings → Environment Variables**) and redeploy.
- **Daily limits keep YouTube's free allowance safe.** Each person gets 10 searches and 3 playlist imports a day, and all friends together get 80 searches. Pasting a link to one video isn't limited. The numbers are at the top of `lyrics-game/src/lib/limits.ts`.
- **Friends' data** is a random id in a cookie. Clearing the browser's cookies starts that person from zero, and there is no sync between devices. Lyrics and the video chosen for each song are shared, so a song one friend added is quick for the next.
- **Previews are private.** Vercel puts every non-`main` branch on its own address that only you can open while logged in to Vercel. Friends use the main address.
- **Free-plan limits.** The first visit after a quiet spell can take a few seconds. Upstash's free plan has a monthly allowance that is plenty for a few friends.
- **Lyrics** come from LRCLIB, a community service, and aren't licensed for public use. That is why the link is behind a word and shared only with friends.

## For developers

Built with Next.js 16, React and TypeScript. On your computer, everything is stored as files in `.data/`. The web version (`APP_MODE=web`) keeps the same data in a free Upstash Redis database instead, through the same code (`src/lib/storage.ts`).

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the app on port 3000 |
| `npm test` | Checks the game rules (`lyrics-game/src/lib/*.test.ts`) |
| `npm run lint` | Checks the code style |
| `npm run build` | Builds the app the way it would run for real |

- `lyrics-game/src/lib/`: the logic (Spotify, library, lyrics, game rules, saved data).
- `lyrics-game/src/app/`: the pages and the `api/` routes.
- [`spec.md`](spec.md), [`plan.md`](plan.md) and [`Output/`](Output/): how the project was planned and built, phase by phase.
