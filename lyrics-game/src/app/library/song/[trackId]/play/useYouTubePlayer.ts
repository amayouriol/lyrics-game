"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPlayer, hideCaptions, YT_STATE, type YTPlayer } from "./youtubeApi";
import type { Player, PlayerOptions, PlayerStatus } from "./playerTypes";

/**
 * The player sits small in the bottom-right corner, above the game's player
 * bar (88 px tall). YouTube's rules: never hidden or covered. The "Wrong
 * video?" link (wrongVideo.module.css) sits just above it.
 */
const PLAYER_WIDTH = 356;
const PLAYER_HEIGHT = 200;
const PLAYER_BOTTOM = 112;
const READY_TIMEOUT_MS = 12_000;
const POLL_MS = 250;
/** YouTube pauses almost at once, so the wait before a line can start later than Spotify's. */
const HOLD_LEAD_MS = 150;
/** If no "ended" event arrives, treat the song as over this long after its length. */
const END_GRACE_MS = 1_500;
/**
 * While an ad plays, the player reports the ad's length, not the song's. A
 * gap this big means an ad (ads run 5 to 30 s; songs are much longer).
 */
const AD_LENGTH_GAP_MS = 20_000;

interface Clock {
  positionMs: number;
  /** performance.now() when positionMs was true */
  at: number;
  paused: boolean;
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

export type YouTubePlayerOptions = PlayerOptions & { videoId: string | null };

/**
 * Plays one song with YouTube's official player and tracks its position, in
 * the same shape as `usePlayer` (Spotify). The clock logic mirrors that file:
 * keep the two in step when one changes.
 */
export function useYouTubePlayer({
  videoId,
  durationMs,
  lineTimesMs,
  onEnded,
  enabled = true,
}: YouTubePlayerOptions): Player {
  const [status, setStatus] = useState<PlayerStatus>({ kind: "connecting" });
  const [paused, setPaused] = useState(true);
  const [held, setHeld] = useState(false);
  const [heldSince, setHeldSince] = useState<number | null>(null);
  const [positionSec, setPositionSec] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);

  const playerRef = useRef<YTPlayer | null>(null);
  const clockRef = useRef<Clock>({ positionMs: 0, at: 0, paused: true });
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const onEndedRef = useRef(onEnded);
  const holdRef = useRef<number | null>(null);
  const heldRef = useRef(false);
  const lastHideRef = useRef(0);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  const setHoldBeforeMs = useCallback((ms: number | null) => {
    holdRef.current = ms;
  }, []);

  // Create the corner player and follow it.
  useEffect(() => {
    if (!enabled || !videoId) return;
    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | undefined;
    let player: YTPlayer | null = null;
    let adLogged = false;

    startedRef.current = false;
    endedRef.current = false;
    heldRef.current = false;
    clockRef.current = { positionMs: 0, at: performance.now(), paused: true };

    const host = document.createElement("div");
    host.style.cssText = `position:fixed;right:16px;bottom:${PLAYER_BOTTOM}px;width:${PLAYER_WIDTH}px;height:${PLAYER_HEIGHT}px;z-index:50;background:#000;border-radius:8px;overflow:hidden;`;
    const slot = document.createElement("div");
    host.appendChild(slot);
    document.body.appendChild(host);

    const fail = (error: "start_failed" | "video_unavailable", detail?: string) => {
      if (!cancelled) setStatus({ kind: "error", error, detail });
    };

    const end = () => {
      if (endedRef.current) return;
      endedRef.current = true;
      onEndedRef.current();
    };

    /** True while YouTube is showing an ad instead of the song. */
    const isAd = (p: YTPlayer): boolean => {
      const duration = p.getDuration() * 1000;
      const shownId = p.getVideoData()?.video_id;
      return (
        (shownId !== undefined && shownId !== "" && shownId !== videoId) ||
        (duration > 0 && Math.abs(duration - durationMs) > AD_LENGTH_GAP_MS)
      );
    };

    /** Reads the player's state into the game's clock. */
    const sync = () => {
      const p = playerRef.current;
      if (cancelled || !p) return;
      const state = p.getPlayerState();
      const nowPlaying = state === YT_STATE.playing || state === YT_STATE.buffering;

      if (nowPlaying && isAd(p)) {
        if (!adLogged) {
          adLogged = true;
          console.info(
            `[youtube] ad detected (shown ${p.getVideoData()?.video_id}, length ${Math.round(p.getDuration())}s)`
          );
        }
        clockRef.current = { positionMs: 0, at: performance.now(), paused: true };
        setPaused(true);
        setStatus((s) => (s.kind === "error" ? s : { kind: "ad" }));
        return;
      }
      adLogged = false;

      if (state === YT_STATE.ended) {
        if (startedRef.current) end();
        return;
      }
      if (state === YT_STATE.playing) {
        const hold = holdRef.current;
        const position = p.getCurrentTime() * 1000;
        if (heldRef.current && hold !== null) {
          // Waiting for an answer: keep the clock before the next line.
          clockRef.current = { positionMs: Math.min(position, hold - 1), at: performance.now(), paused: true };
          return;
        }
        // The captions module loads again after a pause (seen 2026-10-15), so
        // while the song plays it is told to stay off, once a second.
        if (performance.now() - lastHideRef.current > 1000) {
          lastHideRef.current = performance.now();
          hideCaptions(p);
        }
        startedRef.current = true;
        clockRef.current = { positionMs: position, at: performance.now(), paused: false };
        setPaused(false);
        setStatus((s) => (s.kind === "error" ? s : { kind: "playing" }));
      } else if (state === YT_STATE.paused && startedRef.current) {
        const hold = holdRef.current;
        const position = p.getCurrentTime() * 1000;
        // Our own wait before a line: keep the clock before that line.
        const at = heldRef.current && hold !== null ? Math.min(position, hold - 1) : position;
        clockRef.current = { positionMs: at, at: performance.now(), paused: true };
        setPaused(true);
      } else if (state === YT_STATE.buffering && startedRef.current) {
        // A stall isn't a pause: stop the clock but don't show "Paused."
        clockRef.current = { positionMs: p.getCurrentTime() * 1000, at: performance.now(), paused: true };
      }
    };

    const readyTimeout = setTimeout(() => {
      if (!playerRef.current) fail("start_failed");
    }, READY_TIMEOUT_MS);

    (async () => {
      try {
        const created = await createPlayer(slot, {
          width: PLAYER_WIDTH,
          height: PLAYER_HEIGHT,
          videoId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            playsinline: 1,
            rel: 0,
            cc_load_policy: 0,
            iv_load_policy: 3,
            origin: window.location.origin,
          },
          events: {
            onReady: (e) => {
              clearTimeout(readyTimeout);
              if (cancelled) return;
              playerRef.current = e.target;
              hideCaptions(e.target);
              e.target.playVideo();
              poll = setInterval(sync, POLL_MS);
            },
            onStateChange: () => {
              lastHideRef.current = 0; // a new state (resuming after a pause): switch captions off at once
              sync();
            },
            onError: (e) => {
              // 2: bad video id; 5: player problem; 100: removed or private;
              // 101 and 150: the owner doesn't allow it to play in other sites.
              console.info(`[youtube] error ${e.data}`);
              fail(e.data === 5 ? "start_failed" : "video_unavailable", `YouTube error ${e.data}`);
            },
            onAutoplayBlocked: () => {
              if (!cancelled) setStatus({ kind: "blocked" });
            },
          },
        });
        if (cancelled) created.destroy();
        else player = created;
      } catch {
        fail("start_failed");
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(poll);
      clearTimeout(readyTimeout);
      try {
        player?.destroy();
      } catch {
        // The player may not have finished loading.
      }
      host.remove();
      playerRef.current = null;
    };
  }, [enabled, videoId, durationMs]);

  // Advance the clock between player checks, and hold at line ends.
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    let lastSec = -1;
    let lastLine = -1;
    const tick = () => {
      const hold = holdRef.current;
      if (heldRef.current && hold === null) {
        // Answered (or skipped): let the song continue.
        heldRef.current = false;
        setHeld(false);
        setHeldSince(null);
        setPaused(false);
        clockRef.current = { ...clockRef.current, at: performance.now(), paused: false };
        playerRef.current?.playVideo();
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
        setHeldSince(performance.now());
        clockRef.current = {
          positionMs: Math.min(clockPosition(clockRef.current), hold - 1),
          at: performance.now(),
          paused: true,
        };
        playerRef.current?.pauseVideo();
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
  }, [enabled, durationMs, lineTimesMs]);

  const togglePause = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (p.getPlayerState() === YT_STATE.playing) p.pauseVideo();
    else p.playVideo();
  }, []);

  /** YouTube never moves to another device, so there's nothing to take back. */
  const resume = useCallback(async () => {
    playerRef.current?.playVideo();
  }, []);

  /** After the browser blocked sound: this runs inside a click, which allows it. */
  const unblock = useCallback(() => {
    playerRef.current?.playVideo();
    setStatus({ kind: "connecting" });
  }, []);

  const retry = useCallback(() => {
    window.location.reload();
  }, []);

  const getPositionMs = useCallback(() => clockPosition(clockRef.current), []);

  const stop = useCallback(async () => {
    try {
      playerRef.current?.pauseVideo();
    } catch {
      // Leaving the screen removes the player anyway.
    }
  }, []);

  return {
    status,
    paused,
    held,
    heldSince,
    positionSec,
    lineIndex,
    togglePause,
    resume,
    unblock,
    retry,
    stop,
    setHoldBeforeMs,
    getPositionMs,
  };
}
