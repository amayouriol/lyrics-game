"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlayerBar } from "@/components/PlayerBar";
import { loadSong, songHref, type SongResult, type TrackSummary } from "../loadSong";
import { usePlayer, type PlayerError } from "./usePlayer";
import styles from "./play.module.css";

const ERRORS: Record<PlayerError, { title: string; body: string }> = {
  permissions: {
    title: "Reconnect Spotify to allow playback.",
    body: "Your current login doesn't include permission to play music in this browser.",
  },
  premium: {
    title: "Spotify Premium is required to play songs here.",
    body: "Spotify only lets Premium accounts play full songs in the browser.",
  },
  unsupported: {
    title: "This browser can't play Spotify songs.",
    body: "It's missing the copy protection Spotify requires. Try Chrome, Edge or Firefox.",
  },
  start_failed: {
    title: "The player didn't start.",
    body: "Spotify's player didn't respond. It's probably a blip.",
  },
};

export function PlayClient({ trackId, from }: { trackId: string; from: string | null }) {
  const router = useRouter();
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<{ key: number; value: SongResult } | null>(null);

  useEffect(() => {
    let ignore = false;
    loadSong(trackId).then((value) => {
      if (ignore) return;
      if (value === "expired") {
        router.push("/?expired=1");
        return;
      }
      setResult({ key: reloadKey, value });
    });
    return () => {
      ignore = true;
    };
  }, [trackId, reloadKey, router]);

  const song = result && result.key === reloadKey ? result.value : null;
  const backHref = songHref(trackId, from);

  if (song?.kind === "ready" && song.status === "available") {
    return (
      <PlayScreen
        trackId={trackId}
        track={song.track}
        lineTimesMs={song.lineTimesMs}
        backHref={backHref}
      />
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.body}>
        <div className={styles.topBar}>
          <Link href={backHref} className="btn btn--ghost btn--sm">
            Back to song
          </Link>
        </div>
        <div className={styles.center}>
          {!song && <div className={styles.status}>Getting the player ready…</div>}
          {(song?.kind === "not_found" ||
            (song?.kind === "ready" && song.status === "unavailable")) && (
            <div className={styles.status}>Lyrics not available for this song.</div>
          )}
          {(song?.kind === "lyrics_error" || song?.kind === "error") && (
            <div className={styles.panel}>
              <h2>
                {song.kind === "lyrics_error"
                  ? "The lyrics service is having a moment."
                  : "Spotify didn't answer."}
              </h2>
              <p>We couldn&apos;t load this song. It&apos;s probably a blip.</p>
              <button className="btn btn--secondary" onClick={() => setReloadKey((k) => k + 1)}>
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function PlayScreen({
  trackId,
  track,
  lineTimesMs,
  backHref,
}: {
  trackId: string;
  track: TrackSummary;
  lineTimesMs: number[];
  backHref: string;
}) {
  const router = useRouter();
  const onEnded = useCallback(() => router.push(backHref), [router, backHref]);
  const { status, paused, positionSec, lineIndex, togglePause, resume, unblock, retry, stop } =
    usePlayer({ trackId, durationMs: track.durationMs, lineTimesMs, onEnded });

  async function quit() {
    await stop();
    router.push(backHref);
  }

  const started = status.kind === "playing" || status.kind === "dropped";

  return (
    <main className={styles.main}>
      <div className={styles.body}>
        <div className={styles.topBar}>
          <button className="btn btn--ghost btn--sm" onClick={quit}>
            Quit song
          </button>
        </div>

        {status.kind === "dropped" && (
          <div className={styles.dropped}>
            <div>
              <div className={styles.droppedTitle}>Playback dropped.</div>
              <div className={styles.droppedBody}>Spotify lost the connection to this browser.</div>
            </div>
            <button className="btn" onClick={resume}>
              Resume
            </button>
          </div>
        )}

        <div className={styles.center}>
          {status.kind === "connecting" && (
            <div className={styles.status}>Getting the player ready…</div>
          )}

          {started && (
            <>
              <div className={styles.line}>
                {lineIndex === 0 ? "· · ·" : `Line ${lineIndex} of ${lineTimesMs.length}`}
              </div>
              <div className={styles.help}>
                {lineIndex === 0 ? "Get ready. The first line is coming." : paused ? "Paused." : ""}
              </div>
            </>
          )}

          {status.kind === "blocked" && (
            <div className={styles.panel}>
              <h2>Your browser blocked the sound.</h2>
              <p>Browsers only allow sound after you click something.</p>
              <button className="btn btn--lg" onClick={unblock}>
                Start the music
              </button>
            </div>
          )}

          {status.kind === "error" && (
            <div className={styles.panel}>
              <h2>{ERRORS[status.error].title}</h2>
              <p>{ERRORS[status.error].body}</p>
              <div className={styles.actions}>
                {status.error === "permissions" && (
                  // Plain link: this is a server route, not a page to prefetch.
                  <a href="/api/auth/login" className="btn">
                    Reconnect Spotify
                  </a>
                )}
                {status.error === "start_failed" && (
                  <button className="btn" onClick={retry}>
                    Retry
                  </button>
                )}
                <Link href={backHref} className="btn btn--ghost">
                  Back to song
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.playerBar}>
        <PlayerBar
          title={track.title}
          artist={track.artist}
          cover={track.cover}
          playing={status.kind === "playing" && !paused}
          positionSec={positionSec}
          durationSec={track.durationMs / 1000}
          onToggle={togglePause}
          disabled={status.kind !== "playing"}
        />
      </div>
    </main>
  );
}
