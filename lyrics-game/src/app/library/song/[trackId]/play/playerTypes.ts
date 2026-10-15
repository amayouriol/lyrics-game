/**
 * What the game screens need from a music player, whichever service is behind
 * it (Spotify today, YouTube next). Screens use these types and `usePlayback`,
 * never a service's own types.
 */

export type PlayerError = "permissions" | "premium" | "unsupported" | "start_failed";

export type PlayerStatus =
  | { kind: "connecting" }
  | { kind: "playing" } // the song has started; it may be paused
  | { kind: "dropped" }
  | { kind: "blocked" }
  | { kind: "error"; error: PlayerError };

export interface PlayerOptions {
  trackId: string;
  durationMs: number;
  lineTimesMs: number[];
  onEnded: () => void;
}

export interface Player {
  status: PlayerStatus;
  paused: boolean;
  /** The song is waiting for an answer before the next line. */
  held: boolean;
  /** performance.now() when the current wait began; null when not waiting. */
  heldSince: number | null;
  positionSec: number;
  /** Number of lines whose start time has passed. */
  lineIndex: number;
  togglePause: () => void;
  /** After playback dropped: take it back to this browser at the same spot. */
  resume: () => Promise<void>;
  /** After the browser blocked sound: call inside a click. */
  unblock: () => void;
  retry: () => void;
  /** Pauses before leaving, so the music stops right away. */
  stop: () => Promise<void>;
  /** A point the song must not pass yet; null lets it continue. */
  setHoldBeforeMs: (ms: number | null) => void;
  /** The song's position right now, between re-renders (for animations). */
  getPositionMs: () => number;
}
