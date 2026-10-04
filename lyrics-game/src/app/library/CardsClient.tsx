"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NoteIcon } from "@/components/icons";
import type { Source } from "@/lib/spotify";
import { ago, fetchJson, moment, playlistHref, spotifyTrouble, type LoadState } from "./libraryData";
import { LibrarySearch } from "./LibrarySearch";
import { SavedColumn } from "./MainColumns";
import styles from "./library.module.css";

interface SourcesAnswer {
  sources: Source[];
  /** When the list was loaded from Spotify. */
  updatedAt: number;
  /** Spotify is refusing until then, so this is an older saved copy. */
  blockedUntil: number | null;
}

type Loaded =
  | { key: number; status: "ready"; data: SourcesAnswer; loadedAt: number }
  | { key: number; status: "error"; rateLimited: boolean; retryAt?: number };

/**
 * The library's main page: Favorites and Play later, your Spotify
 * playlists as cards, and search + filters for the whole library on the
 * right. The playlist list comes from the app's saved copy when it's
 * recent; "Refresh from Spotify" reloads it now.
 */
export function CardsClient() {
  const router = useRouter();
  const [request, setRequest] = useState({ key: 0, refresh: false });
  const [result, setResult] = useState<Loaded | null>(null);

  useEffect(() => {
    let ignore = false;
    const url = `/api/library/sources${request.refresh ? "?refresh=1" : ""}`;
    fetchJson<SourcesAnswer>(url).then((r) => {
      if (ignore) return;
      if (r.status === "expired") {
        router.push("/?expired=1");
        return;
      }
      setResult(
        r.status === "error"
          ? { key: request.key, status: "error", rateLimited: r.rateLimited, retryAt: r.retryAt }
          : { key: request.key, status: "ready", data: r.data, loadedAt: Date.now() }
      );
    });
    return () => {
      ignore = true;
    };
  }, [request, router]);

  const current = result && result.key === request.key ? result : null;
  const state: LoadState = current ? current.status : "loading";
  const answer = current?.status === "ready" ? current : null;
  const trouble = current?.status === "error" ? current : null;
  const reload = (refresh: boolean) => setRequest((r) => ({ key: r.key + 1, refresh }));

  return (
    <div className={styles.mainPage}>
      <main className={styles.page}>
        <div className={styles.heading}>
          <h1>Your library</h1>
          {answer && (
            <p className={styles.updated}>
              {answer.data.blockedUntil
                ? `Spotify is limiting this app until ${moment(answer.data.blockedUntil)}; showing your playlists as of ${ago(answer.data.updatedAt, answer.loadedAt)}.`
                : `Updated from Spotify ${ago(answer.data.updatedAt, answer.loadedAt)}.`}
              {!answer.data.blockedUntil && (
                <button className="btn btn--ghost btn--sm" onClick={() => reload(true)}>
                  Refresh from Spotify
                </button>
              )}
            </p>
          )}
        </div>

        <div className={styles.columns}>
          <SavedColumn list="favorites" />
          <SavedColumn list="later" />
        </div>

        <h2 className={styles.sectionTitle}>Your Spotify playlists</h2>

        {state === "loading" && <div className={styles.hint}>Loading your playlists…</div>}

        {trouble && (
          <div className={styles.errorPanel}>
            <h2>{spotifyTrouble(trouble.rateLimited, trouble.retryAt).title}</h2>
            <p>
              We couldn&apos;t load your playlists or liked songs.{" "}
              {spotifyTrouble(trouble.rateLimited, trouble.retryAt).body}
            </p>
            <button className="btn btn--secondary" onClick={() => reload(false)}>
              Retry
            </button>
          </div>
        )}

        {answer && (
          <>
            <div className={styles.cards}>
              {answer.data.sources.map((source) => (
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

      <LibrarySearch />
    </div>
  );
}
