"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./song.module.css";

interface TrackSummary {
  title: string;
  artist: string;
  cover: string | null;
  duration: string;
}

type SongResult =
  | { kind: "ready"; track: TrackSummary; status: "available" | "unavailable"; lineCount: number }
  | { kind: "lyrics_error"; track: TrackSummary }
  | { kind: "error" }
  | { kind: "not_found" };

async function loadSong(trackId: string): Promise<SongResult | "expired"> {
  try {
    const res = await fetch(`/api/lyrics/${encodeURIComponent(trackId)}`);
    if (res.status === 401) return "expired";
    if (res.status === 404) return { kind: "not_found" };
    const body = await res.json();
    if (res.status === 503 && body.track) return { kind: "lyrics_error", track: body.track };
    if (!res.ok) return { kind: "error" };
    return { kind: "ready", track: body.track, status: body.status, lineCount: body.lineCount };
  } catch {
    return { kind: "error" };
  }
}

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
            <div className={styles.meta}>
              {song.lineCount} lines · {song.track.duration}
            </div>
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
