"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchToken, getSharedPlayer, type PlayerError } from "./sharedPlayer";

export type { PlayerError };

const READY_TIMEOUT_MS = 10_000;
const RESYNC_MS = 1_000;
/** Checks in a row where this browser isn't the active player before pausing the game. */
const DROP_CONFIRM_CHECKS = 2;
/** Near the end, a missing state is the song finishing, not a drop. */
const END_ZONE_MS = 3_000;
/** If no "song ended" event arrives, treat the song as over this long after its length. */
const END_GRACE_MS = 1_500;
/**
 * How early to pause before a hold point. Spotify takes a moment to stop,
 * so pausing slightly early keeps the next line's first word from playing.
 */
const HOLD_LEAD_MS = 300;

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
 * Plays one song on the page's shared Spotify player and tracks its
 * position. Re-renders only when the shown second or line changes.
 *
 * `setHoldBeforeMs(ms)`: a point the song must not pass yet (the next line,
 * while the current one has unanswered words). The song pauses just before
 * it and continues by itself once the hold is set back to null.
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
  const [status, setStatus] = useState<PlayerStatus>({ kind: "connecting" });
  const [paused, setPaused] = useState(true);
  const [held, setHeld] = useState(false);
  const [positionSec, setPositionSec] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);

  const playerRef = useRef<Spotify.Player | null>(null);
  const deviceRef = useRef<string | null>(null);
  const clockRef = useRef<Clock>({ positionMs: 0, at: 0, paused: true });
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const onEndedRef = useRef(onEnded);
  const holdRef = useRef<number | null>(null);
  const heldRef = useRef(false);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  const setHoldBeforeMs = useCallback((ms: number | null) => {
    holdRef.current = ms;
  }, []);

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

  // Attach to the shared player and start this song on it.
  useEffect(() => {
    let cancelled = false;
    let player: Spotify.Player | null = null;
    let readyTimeout: ReturnType<typeof setTimeout> | undefined;
    let resync: ReturnType<typeof setInterval> | undefined;
    let playRequested = false;
    let dropped = false;
    let missedChecks = 0;
    /** Clock position at the first check that found this browser inactive. */
    let positionAtFirstMiss = 0;

    deviceRef.current = null;
    startedRef.current = false;
    endedRef.current = false;
    heldRef.current = false;
    clockRef.current = { positionMs: 0, at: performance.now(), paused: true };

    const fail = (error: PlayerError) => {
      if (!cancelled) setStatus({ kind: "error", error });
    };

    /** Pauses the game where the music stopped, so Resume continues from there. */
    const markDropped = (reason: string, atPositionMs = clockPosition(clockRef.current)) => {
      if (cancelled || dropped || !startedRef.current || endedRef.current) return;
      dropped = true;
      console.info(`[player] game paused (${reason}) at ${Math.round(atPositionMs / 1000)}s`);
      clockRef.current = { positionMs: atPositionMs, at: performance.now(), paused: true };
      // Once Resume plays again, the hold check pauses at the line end anew if still needed.
      heldRef.current = false;
      setHeld(false);
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
      if (!state) return markDropped("player inactive");

      const { current_track, previous_tracks } = state.track_window;
      const finished =
        startedRef.current &&
        state.paused &&
        state.position === 0 &&
        previous_tracks.some((t) => isTrack(t, trackId));
      if (finished) return end();
      if (!isTrack(current_track, trackId)) {
        // Before this song starts, the shared player may still report the
        // previous one: ignore that. After it started, another song means
        // the music moved on: Spotify autoplaying at the very end, or
        // playback taken over elsewhere.
        if (!startedRef.current) return;
        if (clockPosition(clockRef.current) > durationMs - END_ZONE_MS) return end();
        return markDropped(`now playing another song: ${current_track?.name ?? "unknown"}`);
      }

      dropped = false;
      missedChecks = 0;
      const hold = holdRef.current;
      if (heldRef.current && hold !== null) {
        // Waiting for an answer: Spotify may report a spot a little past the
        // hold point (it stops with a short delay), or a late "playing"
        // state. Keep the clock before the next line so it doesn't start.
        clockRef.current = {
          positionMs: Math.min(state.position, hold - 1),
          at: performance.now(),
          paused: true,
        };
        setPaused(true);
        return;
      }
      clockRef.current = { positionMs: state.position, at: performance.now(), paused: state.paused };
      setPaused(state.paused);
      if (!state.paused) startedRef.current = true;
      if (startedRef.current) {
        // A blocked or failed player stays that way until the user acts.
        setStatus((s) => (s.kind === "error" || s.kind === "blocked" ? s : { kind: "playing" }));
      }
    };

    const startOn = async (deviceId: string) => {
      deviceRef.current = deviceId;
      clearTimeout(readyTimeout);
      if (playRequested) return;
      playRequested = true;
      player?.activateElement();
      const result = await requestPlay(0);
      if (cancelled) return;
      if (result === "expired") expire();
      else if (result === "premium") fail("premium");
      else if (result === "failed") fail("start_failed");
    };

    // Named so they can be removed: the player outlives this song.
    const onReady = ({ device_id }: Spotify.WebPlaybackInstance) => {
      if (!cancelled) startOn(device_id);
    };
    const onNotReady = () => markDropped("player went offline");
    const onInitError = () => fail("unsupported");
    const onAuthError = () => fail("permissions");
    const onAccountError = () => fail("premium");
    const onPlaybackError = () => {
      if (startedRef.current) markDropped("playback error");
      else fail("start_failed");
    };
    const onAutoplayFailed = () => {
      if (!cancelled) setStatus({ kind: "blocked" });
    };
    const onState = (state: Spotify.PlaybackState) => handleState(state);

    (async () => {
      const token = await fetchToken();
      if (cancelled) return;
      if (token === "expired") return expire();
      if (!token) return fail("start_failed");
      if (token.missingScopes.length > 0) return fail("permissions");

      let shared;
      try {
        shared = await getSharedPlayer();
      } catch {
        return fail("start_failed");
      }
      if (cancelled) return;
      if (shared.failure) return fail(shared.failure);

      player = shared.player;
      playerRef.current = player;
      player.addListener("ready", onReady);
      player.addListener("not_ready", onNotReady);
      player.addListener("initialization_error", onInitError);
      player.addListener("authentication_error", onAuthError);
      player.addListener("account_error", onAccountError);
      player.addListener("playback_error", onPlaybackError);
      player.addListener("autoplay_failed", onAutoplayFailed);
      player.addListener("player_state_changed", onState);

      resync = setInterval(() => {
        player?.getCurrentState().then((state) => {
          if (cancelled) return;
          if (state) return handleState(state);
          // No state: this browser isn't the active player any more. When
          // Spotify moves to another device the SDK doesn't always send an
          // event, so this check is what catches it (tested 2026-10-03).
          if (missedChecks === 0) positionAtFirstMiss = clockPosition(clockRef.current);
          missedChecks++;
          const nearEnd = positionAtFirstMiss > durationMs - END_ZONE_MS;
          if (missedChecks >= DROP_CONFIRM_CHECKS && !nearEnd) {
            markDropped("player inactive for 2 checks", positionAtFirstMiss);
          }
        });
      }, RESYNC_MS);

      readyTimeout = setTimeout(() => {
        if (!deviceRef.current) fail("start_failed");
      }, READY_TIMEOUT_MS);

      if (shared.deviceId) {
        startOn(shared.deviceId);
      } else if (!shared.connectStarted) {
        shared.connectStarted = true;
        const connected = await player.connect();
        if (!connected) fail("start_failed");
      }
      // Otherwise another screen started connecting; onReady will fire.
    })();

    return () => {
      cancelled = true;
      clearTimeout(readyTimeout);
      clearInterval(resync);
      if (player) {
        player.removeListener("ready", onReady);
        player.removeListener("not_ready", onNotReady);
        player.removeListener("initialization_error", onInitError);
        player.removeListener("authentication_error", onAuthError);
        player.removeListener("account_error", onAccountError);
        player.removeListener("playback_error", onPlaybackError);
        player.removeListener("player_state_changed", onState);
        // The SDK's types can't remove "autoplay_failed"; the cancelled flag makes it inert.
        // Pause rather than disconnect: the next song reuses this player.
        player.pause().catch(() => {});
      }
      playerRef.current = null;
      deviceRef.current = null;
    };
  }, [trackId, durationMs, requestPlay, expire]);

  // Advance the clock between player events.
  useEffect(() => {
    let frame = 0;
    let lastSec = -1;
    let lastLine = -1;
    const tick = () => {
      const hold = holdRef.current;
      if (heldRef.current && hold === null) {
        // Answered (or skipped): let the song continue. Marked as playing
        // right away so the "Paused." panel doesn't flash before Spotify confirms.
        heldRef.current = false;
        setHeld(false);
        setPaused(false);
        clockRef.current = { ...clockRef.current, at: performance.now(), paused: false };
        playerRef.current?.resume();
      } else if (
        !heldRef.current &&
        hold !== null &&
        startedRef.current &&
        !endedRef.current &&
        !clockRef.current.paused &&
        clockPosition(clockRef.current) >= hold - HOLD_LEAD_MS
      ) {
        // Words still open and the line is ending: wait for the answer.
        heldRef.current = true;
        setHeld(true);
        clockRef.current = {
          positionMs: Math.min(clockPosition(clockRef.current), hold - 1),
          at: performance.now(),
          paused: true,
        };
        playerRef.current?.pause();
      }

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

  /**
   * A fresh player in the same page never registers with Spotify, so
   * retrying means reloading the page, which gives it a new first player.
   */
  const retry = useCallback(() => {
    window.location.reload();
  }, []);

  /** Pauses before leaving, so the music stops right away. */
  const stop = useCallback(async () => {
    try {
      await playerRef.current?.pause();
    } catch {
      // Leaving the screen pauses the player anyway.
    }
  }, []);

  return {
    status,
    paused,
    held,
    positionSec,
    lineIndex,
    togglePause,
    resume,
    unblock,
    retry,
    stop,
    setHoldBeforeMs,
  };
}
