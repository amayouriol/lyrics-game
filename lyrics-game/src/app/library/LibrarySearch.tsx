"use client";

import { useEffect, useMemo, useState } from "react";
import type { LoadState } from "./libraryData";
import { matchesSearch } from "./libraryData";
import { DEFAULT_FILTERS, Filters, isDefault, NoFilterMatch, passesFilters } from "./Filters";
import { SearchBox } from "./SearchBox";
import { TrackList } from "./TrackList";
import { useLyricsCheck } from "./useLyricsCheck";
import type { WholeLibrary } from "./useWholeLibrary";
import styles from "./library.module.css";

/** Waits this long after the last keystroke before searching (and checking lyrics). */
const SEARCH_DELAY_MS = 250;

/**
 * Search and filters across your whole library, in the main page's right
 * column. Results show once you type or change a filter.
 */
export function LibrarySearch({
  state,
  library,
  reload,
}: {
  state: LoadState;
  library: WholeLibrary | null;
  reload: () => void;
}) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setQuery(search), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [search]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const active = search.trim() !== "" || !isDefault(filters);

  const matches = useMemo(
    () => (library && active ? library.tracks.filter((t) => matchesSearch(t, query)) : null),
    [library, active, query]
  );
  // Only the songs found are checked for lyrics (all of them when browsing by filter).
  const { statusOf, languageOf, someUnchecked, retry } = useLyricsCheck(
    matches,
    `${query}|${library ? library.tracks.length : 0}`
  );
  const shown = matches?.filter((t) => passesFilters(t, filters, statusOf, languageOf)) ?? null;

  return (
    <section className={styles.searchColumn} aria-label="Search your whole library">
      <SearchBox value={search} onChange={setSearch} placeholder="Search your whole library" />
      <Filters value={filters} onChange={setFilters} />

      {!active && (
        <p className={styles.hint}>Search, or pick a filter, to browse your whole library.</p>
      )}

      {active && state === "loading" && (
        <div className={styles.hint}>Loading your whole library…</div>
      )}

      {active && state === "error" && (
        <div className={styles.notice}>
          <span>Spotify didn&apos;t answer, so your library couldn&apos;t be searched.</span>
          <button className="btn btn--secondary btn--sm" onClick={reload}>
            Retry
          </button>
        </div>
      )}

      {active && library && library.failed.length > 0 && (
        <div className={styles.notice}>
          <span>Some playlists couldn&apos;t be searched: {library.failed.join(", ")}.</span>
          <button className="btn btn--secondary btn--sm" onClick={reload}>
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
          <div className={styles.resultCount}>
            {shown!.length} {shown!.length === 1 ? "song" : "songs"}
          </div>
          {shown!.length === 0 ? (
            <NoFilterMatch onClear={() => setFilters(DEFAULT_FILTERS)} />
          ) : (
            <TrackList tracks={shown!} statusOf={statusOf} from={null} compact />
          )}
        </>
      )}
    </section>
  );
}
