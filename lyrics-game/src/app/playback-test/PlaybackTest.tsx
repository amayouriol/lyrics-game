"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SDK_URL = "https://sdk.scdn.co/spotify-player.js";
const CONNECT_WARNING_MS = 10_000;

interface TestSong {
  id: string;
  title: string;
  artist: string;
}

interface Position {
  position: number;
  duration: number;
  paused: boolean;
}

async function fetchToken(): Promise<{ accessToken: string; missingScopes: string[] } | null> {
  const res = await fetch("/api/player/token");
  return res.ok ? res.json() : null;
}

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function PlaybackTest() {
  const [log, setLog] = useState<string[]>([]);
  const [missingScopes, setMissingScopes] = useState<string[] | null>(null);
  const [song, setSong] = useState<TestSong | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const playerRef = useRef<Spotify.Player | null>(null);
  const startRef = useRef(0);

  const add = useCallback((text: string) => {
    const seconds = ((performance.now() - startRef.current) / 1000).toFixed(1);
    setLog((lines) => [...lines, `${seconds}s  ${text}`]);
  }, []);

  // Pre-checks: granted permissions, and a song to test with.
  useEffect(() => {
    startRef.current = performance.now();
    fetchToken().then((data) => {
      if (!data) {
        add("Could not get a token from the app (session expired?)");
        return;
      }
      setMissingScopes(data.missingScopes);
      add(
        data.missingScopes.length
          ? `Missing permissions: ${data.missingScopes.join(", ")}`
          : "Token OK, all player permissions granted"
      );
    });
    fetch("/api/library/tracks?source=liked")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { tracks: (TestSong & { lyricsStatus: string })[] } | null) => {
        const tracks = data?.tracks ?? [];
        const pick = tracks.find((t) => t.lyricsStatus === "available") ?? tracks[0];
        if (pick) setSong({ id: pick.id, title: pick.title, artist: pick.artist });
      });
  }, [add]);

  // Load Spotify's player script and connect a player in this browser.
  useEffect(() => {
    let cancelled = false;

    const createPlayer = () => {
      if (cancelled) return;
      add("Spotify player script loaded, creating player");
      const player = new window.Spotify.Player({
        name: "Lyrics Game (test)",
        volume: 0.8,
        getOAuthToken: (cb) => {
          add("Player asked the app for a token");
          fetchToken().then((data) => data && cb(data.accessToken));
        },
      });
      playerRef.current = player;

      player.addListener("ready", ({ device_id }) => {
        add(`READY: this browser is now a Spotify device (${device_id.slice(0, 8)}…)`);
        setDeviceId(device_id);
      });
      player.addListener("not_ready", () => add("not_ready: the device went offline"));
      for (const event of [
        "initialization_error",
        "authentication_error",
        "account_error",
        "playback_error",
      ] as const) {
        player.addListener(event, ({ message }) => add(`ERROR ${event}: ${message}`));
      }
      player.addListener("autoplay_failed", () =>
        add("autoplay_failed: the browser blocked sound until you click")
      );
      player.addListener("player_state_changed", (state) => {
        if (state) add(`state: ${state.paused ? "paused" : "playing"} at ${fmt(state.position)}`);
      });

      add("Calling connect()…");
      const warning = setTimeout(
        () => add(`connect() still pending after ${CONNECT_WARNING_MS / 1000}s (the reported bug)`),
        CONNECT_WARNING_MS
      );
      player.connect().then((ok) => {
        clearTimeout(warning);
        add(`connect() finished: ${ok ? "success" : "failed"}`);
        setConnected(ok);
      });
    };

    if ("Spotify" in window && window.Spotify) {
      setTimeout(createPlayer, 0);
    } else {
      window.onSpotifyWebPlaybackSDKReady = createPlayer;
      if (!document.getElementById("spotify-sdk")) {
        const script = document.createElement("script");
        script.id = "spotify-sdk";
        script.src = SDK_URL;
        script.async = true;
        script.onerror = () => add("ERROR: could not load Spotify's player script");
        document.body.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
  }, [add]);

  // Read the playback position four times a second while a device exists.
  useEffect(() => {
    if (!deviceId) return;
    const timer = setInterval(async () => {
      const state = await playerRef.current?.getCurrentState();
      setPosition(
        state ? { position: state.position, duration: state.duration, paused: state.paused } : null
      );
    }, 250);
    return () => clearInterval(timer);
  }, [deviceId]);

  async function play() {
    const player = playerRef.current;
    if (!player || !deviceId || !song) return;
    // Must run inside the click so the browser allows sound.
    player.activateElement();
    const data = await fetchToken();
    if (!data) return add("Could not get a token to start playback");
    add(`Asking Spotify to play "${song.title}" on this browser…`);
    const res = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${data.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ uris: [`spotify:track:${song.id}`] }),
      }
    );
    add(`Play request answered ${res.status}${res.ok ? "" : `: ${await res.text()}`}`);
  }

  const verdict = (ok: boolean | null, pending: string) =>
    ok === null ? `⋯ ${pending}` : ok ? "✓ yes" : "✗ no";

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 72px", display: "grid", gap: 24 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <h1 style={{ font: "500 32px/1.2 var(--font-sans)", color: "var(--black)" }}>
          Playback test (temporary)
        </h1>
        <p style={{ color: "var(--grey-500)" }}>
          Checks whether Spotify&apos;s in-browser player works for this app. Wait for
          &quot;Player ready&quot;, click Play, and listen.
        </p>
      </div>

      <div style={{ display: "grid", gap: 6, fontFamily: "var(--font-mono)", fontSize: 14 }}>
        <div>
          Permissions granted:{" "}
          {missingScopes === null
            ? "⋯ checking"
            : missingScopes.length === 0
              ? "✓ yes"
              : `✗ missing ${missingScopes.join(", ")}. Log out (top right) and connect again.`}
        </div>
        <div>Player connected: {verdict(connected, "waiting")}</div>
        <div>Player ready: {deviceId ? "✓ yes" : "⋯ waiting"}</div>
        <div>
          Position:{" "}
          {position
            ? `${fmt(position.position)} / ${fmt(position.duration)} (${position.paused ? "paused" : "playing"})`
            : "–"}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn btn--lg" onClick={play} disabled={!deviceId || !song}>
          Play {song ? `"${song.title}"` : ""}
        </button>
        <button
          className="btn btn--secondary btn--lg"
          onClick={() => playerRef.current?.togglePlay()}
          disabled={!deviceId}
        >
          Pause / resume
        </button>
      </div>

      <pre
        style={{
          background: "var(--grey-100)",
          borderRadius: 8,
          padding: 16,
          font: "13px/1.6 var(--font-mono)",
          whiteSpace: "pre-wrap",
          minHeight: 120,
        }}
      >
        {log.join("\n") || "Starting…"}
      </pre>
    </main>
  );
}
