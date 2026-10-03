"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const SDK_URL = "https://sdk.scdn.co/spotify-player.js";
const READY_TIMEOUT_MS = 10_000;
const RESYNC_MS = 1_000;
/** If no "song ended" event arrives, treat the song as over this long after its length. */
const END_GRACE_MS = 1_500;

export type PlayerError = "permissions" | "premium" | "unsupported" | "start_failed";

export type PlayerStatus =
  | { kind: "connecting" }
  | { kind: "playing" } // the song has started; it may be paused
  | { kind: "dropped" }
  | { kind: "blocked" }
  | { kind: "error"; error: PlayerError };

interface Clock {
  positionMs: number;
  /** performance.now() when positionMs was true */
  at: number;
  paused: boolean;
}

let sdkPromise: Promise<void> | null = null;

/** Loads Spotify's player script once per page. */
function loadSdk(): Promise<void> {
  if ("Spotify" in window && window.Spotify) return Promise.resolve();
  sdkPromise ??= new Promise<void>((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onerror = () => {
      sdkPromise = null;
      script.remove();
      reject(new Error("Could not load Spotify's player script"));
    };
    document.body.appendChild(script);
  });
  return sdkPromise;
}

async function fetchToken(): Promise<
  { accessToken: string; missingScopes: string[] } | "expired" | null
> {
  try {
    const res = await fetch("/api/player/token");
    if (res.status === 401) return "expired";
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

function isTrack(t: Spotify.Track | undefined, trackId: string): boolean {
  return Boolean(
    t && (t.id === trackId || t.linked_from?.id === trackId || t.uri === `spotify:track:${trackId}`)
  );
}

function clockPosition(clock: Clock): number {
  return clock.paused ? clock.positionMs : clock.positionMs + (performance.now() - clock.at);
}

/** Number of lines whose start time has passed. */
function linesStarted(lineTimesMs: number[], positionMs: number): number {
  let count = 0;
  while (count < lineTimesMs.length && lineTimesMs[count] <= positionMs) count++;
  return count;
}

/**
 * Plays one song in this browser with Spotify's Web Playback SDK and tracks
 * its position. Re-renders only when the shown second or line changes.
 */
export function usePlayer({
  trackId,
  durationMs,
  lineTimesMs,
  onEnded,
}: {
  trackId: string;
  durationMs: number;
  lineTimesMs: number[];
  onEnded: () => void;
}) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<PlayerStatus>({ kind: "connecting" });
  const [paused, setPaused] = useState(true);
  const [positionSec, setPositionSec] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);

  const playerRef = useRef<Spotify.Player | null>(null);
  const deviceRef = useRef<string | null>(null);
  const clockRef = useRef<Clock>({ positionMs: 0, at: 0, paused: true });
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const onEndedRef = useRef(onEnded);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  const expire = useCallback(() => router.push("/?expired=1"), [router]);

  const requestPlay = useCallback(
    async (positionMs: number): Promise<"ok" | "expired" | "premium" | "failed"> => {
      const deviceId = deviceRef.current;
      if (!deviceId) return "failed";
      try {
        const res = await fetch("/api/player/play", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId, trackId, positionMs }),
        });
        if (res.ok) return "ok";
        if (res.status === 401) return "expired";
        if (res.status === 403) return "premium";
        return "failed";
      } catch {
        return "failed";
      }
    },
    [trackId]
  );

  // Connect a player in this browser and start the song.
  useEffect(() => {
    let cancelled = false;
    let player: Spotify.Player | null = null;
    let readyTimeout: ReturnType<typeof setTimeout> | undefined;
    let resync: ReturnType<typeof setInterval> | undefined;
    let playRequested = false;

    deviceRef.current = null;
    startedRef.current = false;
    endedRef.current = false;
    clockRef.current = { positionMs: 0, at: performance.now(), paused: true };

    const fail = (error: PlayerError) => {
      if (!cancelled) setStatus({ kind: "error", error });
    };

    const markDropped = () => {
      if (cancelled || !startedRef.current || endedRef.current) return;
      // Freeze the clock where the music stopped, so Resume continues from there.
      clockRef.current = {
        positionMs: clockPosition(clockRef.current),
        at: performance.now(),
        paused: true,
      };
      setPaused(true);
      setStatus((s) => (s.kind === "error" ? s : { kind: "dropped" }));
    };

    const end = () => {
      if (endedRef.current) return;
      endedRef.current = true;
      onEndedRef.current();
    };

    const handleState = (state: Spotify.PlaybackState | null) => {
      if (cancelled) return;
      // A null state means this browser is no longer the active player
      // (e.g. Spotify started playing on another device).
      if (!state) return markDropped();

      const { current_track, previous_tracks } = state.track_window;
      const finished =
        startedRef.current &&
        state.paused &&
        state.position === 0 &&
        previous_tracks.some((t) => isTrack(t, trackId));
      if (finished) return end();
      if (!isTrack(current_track, trackId)) return;

      clockRef.current = { positionMs: state.position, at: performance.now(), paused: state.paused };
      setPaused(state.paused);
      if (!state.paused) startedRef.current = true;
      if (startedRef.current) {
        // A blocked or failed player stays that way until the user acts.
        setStatus((s) => (s.kind === "error" || s.kind === "blocked" ? s : { kind: "playing" }));
      }
    };

    (async () => {
      const token = await fetchToken();
      if (cancelled) return;
      if (token === "expired") return expire();
      if (!token) return fail("start_failed");
      if (token.missingScopes.length > 0) return fail("permissions");

      try {
        await loadSdk();
      } catch {
        return fail("start_failed");
      }
      if (cancelled) return;

      player = new window.Spotify.Player({
        name: "Lyrics Game",
        volume: 0.8,
        getOAuthToken: (cb) => {
          fetchToken().then((t) => {
            if (t && t !== "expired") cb(t.accessToken);
          });
        },
      });
      playerRef.current = player;

      readyTimeout = setTimeout(() => {
        if (!deviceRef.current) fail("start_failed");
      }, READY_TIMEOUT_MS);

      player.addListener("ready", async ({ device_id }) => {
        if (cancelled) return;
        deviceRef.current = device_id;
        clearTimeout(readyTimeout);
        // The player can reconnect mid-song; only the first ready starts it.
        if (playRequested) return;
        playRequested = true;
        player?.activateElement();
        const result = await requestPlay(0);
        if (cancelled) return;
        if (result === "expired") expire();
        else if (result === "premium") fail("premium");
        else if (result === "failed") fail("start_failed");
      });
      player.addListener("not_ready", markDropped);
      player.addListener("initialization_error", () => fail("unsupported"));
      player.addListener("authentication_error", () => fail("permissions"));
      player.addListener("account_error", () => fail("premium"));
      player.addListener("playback_error", () => {
        if (startedRef.current) markDropped();
        else fail("start_failed");
      });
      player.addListener("autoplay_failed", () => {
        if (!cancelled) setStatus({ kind: "blocked" });
      });
      player.addListener("player_state_changed", handleState);

      resync = setInterval(() => {
        player?.getCurrentState().then((state) => {
          if (state) handleState(state);
        });
      }, RESYNC_MS);

      const connected = await player.connect();
      if (!connected) fail("start_failed");
    })();

    return () => {
      cancelled = true;
      clearTimeout(readyTimeout);
      clearInterval(resync);
      // Disconnecting removes this browser as a Spotify device, which stops the music.
      player?.disconnect();
      playerRef.current = null;
      deviceRef.current = null;
    };
  }, [attempt, trackId, requestPlay, expire]);

  // Advance the clock between player events.
  useEffect(() => {
    let frame = 0;
    let lastSec = -1;
    let lastLine = -1;
    const tick = () => {
      const position = clockPosition(clockRef.current);
      const sec = Math.floor(Math.min(position, durationMs) / 1000);
      if (sec !== lastSec) {
        lastSec = sec;
        setPositionSec(sec);
      }
      const line = linesStarted(lineTimesMs, position);
      if (line !== lastLine) {
        lastLine = line;
        setLineIndex(line);
      }
      if (
        startedRef.current &&
        !endedRef.current &&
        !clockRef.current.paused &&
        position > durationMs + END_GRACE_MS
      ) {
        endedRef.current = true;
        onEndedRef.current();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [durationMs, lineTimesMs]);

  const togglePause = useCallback(() => {
    playerRef.current?.togglePlay();
  }, []);

  /** After playback dropped: take it back to this browser at the same spot. */
  const resume = useCallback(async () => {
    const result = await requestPlay(clockRef.current.positionMs);
    if (result === "expired") expire();
    else if (result === "premium") setStatus({ kind: "error", error: "premium" });
    // On "failed" the banner stays, so Resume can be tried again.
  }, [requestPlay, expire]);

  /** After the browser blocked sound: this runs inside a click, which allows it. */
  const unblock = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    player.activateElement();
    player.resume();
    setStatus({ kind: "playing" });
  }, []);

  const retry = useCallback(() => {
    setStatus({ kind: "connecting" });
    setAttempt((a) => a + 1);
  }, []);

  /** Pauses before leaving, so the music stops even if disconnecting lags. */
  const stop = useCallback(async () => {
    try {
      await playerRef.current?.pause();
    } catch {
      // Leaving the page disconnects the player anyway.
    }
  }, []);

  return { status, paused, positionSec, lineIndex, togglePause, resume, unblock, retry, stop };
}
