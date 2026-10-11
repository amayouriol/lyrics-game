# Lyric Drop

A personal lyrics-training game. Pick a song from your own Spotify library, listen to it in the browser, and fill in the words that drop out of the lyrics as they're sung.

- **Type mode**: type the hidden words before the line moves on.
- **Sing mode**: sing the hidden lines out loud; the game listens through your microphone.
- Three levels (Easy, Medium, Hard), a score at the end of each song, and a list of the words you keep missing.

Lyrics come from [LRCLIB](https://lrclib.net), a free lyrics service. Songs without timed lyrics show up in your library but can't be played.

> **Personal project.** This runs on your own computer with your own Spotify account. It isn't a public website, and Spotify's rules don't allow publishing games built on Spotify. Please keep your copy personal too.

## What you need

- **Spotify Premium.** Songs only play in the browser with Premium.
- **Node.js 24** ([nodejs.org](https://nodejs.org)) and **Git** ([git-scm.com](https://git-scm.com)).
- **A desktop browser**: Chrome, Edge or Firefox. Sing mode needs Chrome or Edge, because it uses the browser's speech recognition.
- About 20 minutes for the first setup.

## Setup (once)

### 1. Get the code

```bash
git clone https://github.com/andrea2220896-max/lyrics-game.git
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

### 3. Add your keys

In the `lyrics-game` folder, copy `.env.local.example` to a new file named `.env.local`, then fill it in:

```
SPOTIFY_CLIENT_ID=your Client ID
SPOTIFY_CLIENT_SECRET=your Client secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/callback
SESSION_SECRET=a long random text
```

For `SESSION_SECRET`, this command prints a random one you can paste:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`.env.local` holds your private keys. Never share it or upload it anywhere (git already ignores it).

### 4. Install

```bash
npm install
```

## Play

```bash
npm run dev
```

Then open **http://127.0.0.1:3000** in your browser and click **Connect with Spotify**. Use `127.0.0.1`, not `localhost`, or the Spotify login won't come back to the app.

Leave the terminal open while you play. To stop, press `Ctrl + C` in it. Next time, just run `npm run dev` again.

## Good to know

- **Who can log in.** Your Spotify app starts in test mode: only you can log in. To let someone else use *your* copy, add their name and Spotify email in the dashboard under **User Management** (up to 5 people).
- **Spotify limits requests.** If the app asks too often, Spotify blocks it for a few hours. The app keeps a copy of your library for 6 hours and remembers a block, so it won't keep asking. If you see "Spotify is limiting this app until…", wait until that time.
- **Your data stays on your computer.** Games, saved songs and caches are kept in `lyrics-game/.data/`, which is created on first use and never uploaded. Delete it to start fresh.
- **If Spotify plays on another device** (your phone, for example), the game pauses. Press play in the app to bring it back.

## For developers

Built with Next.js 16, React and TypeScript, with no database: everything is stored as files in `.data/`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the app on port 3000 |
| `npm test` | Checks the game rules (`lyrics-game/src/lib/*.test.ts`) |
| `npm run lint` | Checks the code style |
| `npm run build` | Builds the app the way it would run for real |

- `lyrics-game/src/lib/`: the logic (Spotify, library, lyrics, game rules, saved data).
- `lyrics-game/src/app/`: the pages and the `api/` routes.
- [`spec.md`](spec.md), [`plan.md`](plan.md) and [`Output/`](Output/): how the project was planned and built, phase by phase.
