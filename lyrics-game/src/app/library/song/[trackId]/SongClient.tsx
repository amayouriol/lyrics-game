"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadSong, songHref, type SongResult } from "./loadSong";
import styles from "./song.module.css";

export function SongClient({ trackId, from }: { trackId: string; from: string | null }) {
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
  const track = song && "track" in song ? song.track : null;
  const backHref = from ? `/library?source=${encodeURIComponent(from)}` : "/library";
  const retry = () => setReloadKey((k) => k + 1);

  return (
    <main className={styles.main}>
      <div>
        <Link href={backHref} className="btn btn--ghost btn--sm">
          Back to library
        </Link>
      </div>

      <div className={styles.layout}>
        <div
          className={styles.cover}
          style={track?.cover ? { backgroundImage: `url(${track.cover})` } : undefined}
        >
          {track && !track.cover && <span className={styles.coverTitle}>{track.title}</span>}
        </div>

        <section className={styles.info}>
          {track && (
            <div className={styles.titles}>
              <h1>{track.title}</h1>
              <span className={styles.artist}>{track.artist}</span>
            </div>
          )}

          {!song && <div className={styles.hint}>Fetching synced lyrics…</div>}

          {song?.kind === "ready" && song.status === "available" && (
            <>
              <div className={styles.meta}>
                {song.lineCount} lines · {song.track.duration}
              </div>
              <Link
                href={`${songHref(trackId, null)}/play${from ? `?from=${encodeURIComponent(from)}` : ""}`}
                className="btn btn--lg"
              >
                Play the song
              </Link>
            </>
          )}

          {song?.kind === "ready" && song.status === "unavailable" && (
            <div className={styles.hint}>Lyrics not available</div>
          )}

          {song?.kind === "lyrics_error" && (
            <div className={styles.errorPanel}>
              <h2>The lyrics service is having a moment.</h2>
              <p>We couldn&apos;t fetch synced lyrics for this song. Your library is fine.</p>
              <button className="btn btn--secondary" onClick={retry}>
                Retry
              </button>
            </div>
          )}

          {song?.kind === "error" && (
            <div className={styles.errorPanel}>
              <h2>Spotify didn&apos;t answer.</h2>
              <p>We couldn&apos;t load this song. It&apos;s probably a blip.</p>
              <button className="btn btn--secondary" onClick={retry}>
                Retry
              </button>
            </div>
          )}

          {song?.kind === "not_found" && (
            <div className={styles.hint}>This song couldn&apos;t be found.</div>
          )}
        </section>
      </div>
    </main>
  );
}
