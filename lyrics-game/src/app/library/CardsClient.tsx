"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NoteIcon } from "@/components/icons";
import type { Source } from "@/lib/spotify";
import {
  fetchJson,
  playlistHref,
  spotifyTrouble,
  type KeyedResult,
  type LoadState,
} from "./libraryData";
import { LibrarySearch } from "./LibrarySearch";
import { SavedColumn, SongOfTheDay } from "./MainColumns";
import { useWholeLibrary } from "./useWholeLibrary";
import styles from "./library.module.css";

/**
 * The library's main page: your total, Favorites, Play later and a song of
 * the day, your Spotify playlists as cards, and search + filters for the
 * whole library on the right.
 */
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
          ? { key: reloadKey, status: "error", rateLimited: r.rateLimited, retryAt: r.retryAt }
          : { key: reloadKey, status: "ready", data: r.data.sources }
      );
    });
    return () => {
      ignore = true;
    };
  }, [reloadKey, router]);

  const state: LoadState = !result || result.key !== reloadKey ? "loading" : result.status;
  const sources = state === "ready" ? result!.data! : [];
  const whole = useWholeLibrary();
  const total = whole.library?.tracks.length;

  return (
    <div className={styles.mainPage}>
      <main className={styles.page}>
        <div className={styles.heading}>
          <h1>
            Your library
            <span className={styles.total}>
              {total !== undefined
                ? ` · ${total} ${total === 1 ? "song" : "songs"}`
                : whole.state === "loading"
                  ? " · Counting your songs…"
                  : ""}
            </span>
          </h1>
        </div>

        <div className={styles.columns}>
          <SavedColumn list="favorites" />
          <SavedColumn list="later" />
          <SongOfTheDay state={whole.state} library={whole.library} />
        </div>

        <h2 className={styles.sectionTitle}>Your Spotify playlists</h2>

        {state === "loading" && <div className={styles.hint}>Loading your playlists…</div>}

        {state === "error" && (
          <div className={styles.errorPanel}>
            <h2>{spotifyTrouble(result?.rateLimited, result?.retryAt).title}</h2>
            <p>
              We couldn&apos;t load your playlists or liked songs.{" "}
              {spotifyTrouble(result?.rateLimited, result?.retryAt).body}
            </p>
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
                    {!source.cover && <NoteIcon />}
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

      <LibrarySearch
        state={whole.state}
        library={whole.library}
        rateLimited={whole.rateLimited}
        reload={whole.reload}
      />
    </div>
  );
}
