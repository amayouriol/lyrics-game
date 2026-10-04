"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Source } from "@/lib/spotify";
import { fetchJson, playlistHref, type KeyedResult, type LoadState } from "./libraryData";
import styles from "./library.module.css";

/** Liked Songs, Favorites and Play later get a tile instead of a cover. */
function Tile({ kind }: { kind: Source["kind"] }) {
  if (kind === "favorites") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z" />
      </svg>
    );
  }
  if (kind === "later") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3.5h10a1 1 0 0 1 1 1v16l-6-4-6 4v-16a1 1 0 0 1 1-1z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 18.5a2.5 2.5 0 1 1-2.5-2.5H9V5l11-2v13a2.5 2.5 0 1 1-2.5-2.5H20" />
    </svg>
  );
}

/** The library's first page: every list as a card. */
export function CardsClient() {
  const router = useRouter();
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<KeyedResult<Source[]> | null>(null);

  useEffect(() => {
    let ignore = false;
    fetchJson<{ sources: Source[] }>("/api/library/sources").then((r) => {
      if (ignore) return;
      if (r.status === "expired") {
        router.push("/?expired=1");
        return;
      }
      setResult(
        r.status === "error"
          ? { key: reloadKey, status: "error" }
          : { key: reloadKey, status: "ready", data: r.data.sources }
      );
    });
    return () => {
      ignore = true;
    };
  }, [reloadKey, router]);

  const state: LoadState = !result || result.key !== reloadKey ? "loading" : result.status;
  const sources = state === "ready" ? result!.data! : [];

  return (
    <main className={styles.page}>
      <div className={styles.heading}>
        <h1>Your library</h1>
        <p>Pick a playlist, then a song.</p>
      </div>

      {state === "loading" && <div className={styles.hint}>Loading your library…</div>}

      {state === "error" && (
        <div className={styles.errorPanel}>
          <h2>Spotify didn&apos;t answer.</h2>
          <p>We couldn&apos;t load your playlists or liked songs. It&apos;s probably a blip.</p>
          <button className="btn btn--secondary" onClick={() => setReloadKey((k) => k + 1)}>
            Retry
          </button>
        </div>
      )}

      {state === "ready" && (
        <>
          <div className={styles.cards}>
            {sources.map((source) => (
              <Link key={source.id} href={playlistHref(source.id)} className={styles.card}>
                <div
                  className={`${styles.cardCover} ${source.cover ? "" : styles[`tile_${source.kind}`]}`}
                  style={source.cover ? { backgroundImage: `url(${source.cover})` } : undefined}
                >
                  {!source.cover && <Tile kind={source.kind} />}
                </div>
                <span className={styles.cardName}>{source.name}</span>
                <span className={styles.cardCount}>
                  {source.count} {source.count === 1 ? "song" : "songs"}
                </span>
              </Link>
            ))}
          </div>
          <p className={styles.note}>
            Only playlists you own are listed. Spotify doesn&apos;t let apps read the songs of
            playlists you just follow (like Discover Weekly).
          </p>
        </>
      )}
    </main>
  );
}
