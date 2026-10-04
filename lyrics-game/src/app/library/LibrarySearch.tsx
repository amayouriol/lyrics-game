"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchJson,
  matchesSearch,
  type KeyedResult,
  type LibraryTrack,
  type LoadState,
} from "./libraryData";
import { DEFAULT_FILTERS, Filters, NoFilterMatch, passesFilters } from "./Filters";
import { TrackList } from "./TrackList";
import { useLyricsCheck } from "./useLyricsCheck";
import styles from "./library.module.css";

interface WholeLibrary {
  tracks: LibraryTrack[];
  /** Names of playlists that couldn't be loaded. */
  failed: string[];
}

/** Waits this long after the last keystroke before searching (and checking lyrics). */
const SEARCH_DELAY_MS = 250;

/**
 * Search across Liked Songs and every playlist. The whole library loads on
 * the first search and is kept until you leave the page. Renders nothing
 * while the search is empty.
 */
export function LibrarySearch({ search }: { search: string }) {
  const router = useRouter();
  const active = search.trim() !== "";

  // Load once, the first time you search (and again on Retry).
  const [wanted, setWanted] = useState(false);
  if (active && !wanted) setWanted(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<KeyedResult<WholeLibrary> | null>(null);
  useEffect(() => {
    if (!wanted) return;
    let ignore = false;
    fetchJson<WholeLibrary>("/api/library/all").then((r) => {
      if (ignore) return;
      if (r.status === "expired") {
        router.push("/?expired=1");
        return;
      }
      setResult(
        r.status === "error"
          ? { key: reloadKey, status: "error" }
          : { key: reloadKey, status: "ready", data: r.data }
      );
    });
    return () => {
      ignore = true;
    };
  }, [wanted, reloadKey, router]);

  const [query, setQuery] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setQuery(search), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [search]);

  const state: LoadState = !result || result.key !== reloadKey ? "loading" : result.status;
  const library = state === "ready" ? result!.data! : null;
  const matches = useMemo(
    () => (library && query.trim() ? library.tracks.filter((t) => matchesSearch(t, query)) : null),
    [library, query]
  );
  // Only the songs found are checked for lyrics, not the whole library.
  const { statusOf, languageOf, someUnchecked, retry } = useLyricsCheck(
    matches,
    `${reloadKey}|${query}`
  );
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const shown = matches?.filter((t) => passesFilters(t, filters, statusOf, languageOf)) ?? null;

  if (!active) return null;

  return (
    <>
      {state === "loading" && <div className={styles.hint}>Searching your whole library…</div>}

      {state === "error" && (
        <div className={styles.errorPanel}>
          <h2>Spotify didn&apos;t answer.</h2>
          <p>We couldn&apos;t load your library to search it. It&apos;s probably a blip.</p>
          <button className="btn btn--secondary" onClick={() => setReloadKey((k) => k + 1)}>
            Retry
          </button>
        </div>
      )}

      {library && library.failed.length > 0 && (
        <div className={styles.notice}>
          <span>
            Some playlists couldn&apos;t be searched: {library.failed.join(", ")}.
          </span>
          <button
            className="btn btn--secondary btn--sm"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            Retry
          </button>
        </div>
      )}

      {someUnchecked && (
        <div className={styles.notice}>
          <span>Some songs couldn&apos;t be checked for lyrics.</span>
          <button className="btn btn--secondary btn--sm" onClick={retry}>
            Retry
          </button>
        </div>
      )}

      {matches && matches.length === 0 && (
        <div className={styles.hint}>No songs match “{query.trim()}”.</div>
      )}

      {matches && matches.length > 0 && (
        <>
          <Filters value={filters} onChange={setFilters} />
          <div className={styles.resultCount}>
            {shown!.length === matches.length
              ? `${matches.length} ${matches.length === 1 ? "song" : "songs"} in your library`
              : `${shown!.length} of ${matches.length} songs in your library`}
          </div>
          {shown!.length === 0 ? (
            <NoFilterMatch onClear={() => setFilters(DEFAULT_FILTERS)} />
          ) : (
            <TrackList tracks={shown!} statusOf={statusOf} from={null} />
          )}
        </>
      )}
    </>
  );
}
