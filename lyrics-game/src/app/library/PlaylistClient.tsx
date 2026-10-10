"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowIcon } from "@/components/icons";
import type { Source } from "@/lib/spotify";
import {
  fetchJson,
  matchesSearch,
  moment,
  spotifyTrouble,
  type KeyedResult,
  type LibraryTrack,
  type LoadState,
} from "./libraryData";
import { useSaved } from "./SavedProvider";
import { DEFAULT_FILTERS, Filters, NoFilterMatch, passesFilters } from "./Filters";
import { SearchBox } from "./SearchBox";
import { TrackList } from "./TrackList";
import { useLyricsCheck } from "./useLyricsCheck";
import styles from "./library.module.css";

/** The app's own lists, which aren't among Spotify's sources. */
const SAVED_NAMES: Record<string, string> = { favorites: "Favorites", later: "Play later" };

const EMPTY: Record<string, string> = {
  favorites: "No favorites yet. Use the heart on any song to keep it here.",
  later: "Nothing saved for later. Use the bookmark on any song to keep it here.",
  liked: "No liked songs yet.",
};

/** One list's page: its songs, checked for synced lyrics as they show. */
export function PlaylistClient({ source, sidebar }: { source: string; sidebar: ReactNode }) {
  const router = useRouter();

  // The list's name and count, from the same list as the cards page.
  const [sources, setSources] = useState<Source[] | null>(null);
  useEffect(() => {
    let ignore = false;
    fetchJson<{ sources: Source[] }>("/api/library/sources").then((r) => {
      if (!ignore && r.status === "ok") setSources(r.data.sources);
    });
    return () => {
      ignore = true;
    };
  }, []);
  const info = sources?.find((s) => s.id === source);

  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<KeyedResult<LibraryTrack[]> | null>(null);
  /** Spotify is refusing until then, so the songs are an older saved copy. */
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);
  useEffect(() => {
    let ignore = false;
    fetchJson<{ tracks: LibraryTrack[]; blockedUntil: number | null }>(
      `/api/library/tracks?source=${encodeURIComponent(source)}`
    ).then((r) => {
      if (ignore) return;
      if (r.status === "expired") {
        router.push("/?expired=1");
        return;
      }
      setResult(
        r.status === "error"
          ? { key: reloadKey, status: "error", rateLimited: r.rateLimited, retryAt: r.retryAt }
          : { key: reloadKey, status: "ready", data: r.data.tracks }
      );
      setBlockedUntil(r.status === "ok" ? r.data.blockedUntil : null);
    });
    return () => {
      ignore = true;
    };
  }, [source, reloadKey, router]);

  const state: LoadState = !result || result.key !== reloadKey ? "loading" : result.status;
  const loadedTracks = state === "ready" ? result!.data! : null;
  // On Favorites and Play later, a song you take off leaves the list at once.
  const { lists } = useSaved();
  const savedList = source === "favorites" || source === "later" ? lists?.[source] : undefined;
  const tracks = useMemo(
    () =>
      loadedTracks && savedList
        ? loadedTracks.filter((t) => savedList.some((s) => s.id === t.id))
        : loadedTracks,
    [loadedTracks, savedList]
  );
  const { statusOf, languageOf, someUnchecked, retry } = useLyricsCheck(
    tracks,
    `${source}|${reloadKey}`
  );

  // Filters start from the defaults on every list (this component is keyed by list).
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const found = tracks?.filter((t) => matchesSearch(t, search)) ?? null;
  const shown = found?.filter((t) => passesFilters(t, filters, statusOf, languageOf)) ?? null;
  const count = tracks?.length ?? info?.count;

  const saved = source === "favorites" || source === "later";

  return (
    <main className={styles.screen}>
      <section className={`${styles.top} ${styles.topList}`}>
        <div className={styles.title}>
          <Link href={saved ? "/library" : "/library?tab=spotify"} className={styles.back}>
            <ArrowIcon />
            {saved ? "Back to library" : "All playlists"}
          </Link>
          <p>{saved ? "Saved in Lyric Drop" : "From Spotify"}</p>
          <h1>{SAVED_NAMES[source] ?? info?.name ?? (sources ? "Playlist" : "")}</h1>
          <span>
            {count !== undefined &&
              (shown && shown.length !== count
                ? `${shown.length} of ${count} songs · `
                : `${count} ${count === 1 ? "song" : "songs"} · `)}
            Pick a song. Anything without synced lyrics stays greyed out.
          </span>
        </div>
      </section>

      <div className={styles.listPage}>
        {tracks && tracks.length > 0 && (
          <div className={styles.tools}>
            <SearchBox value={search} onChange={setSearch} placeholder="Search this list" />
            <Filters value={filters} onChange={setFilters} />
          </div>
        )}

        <div className={styles.listLayout}>
          <section className={styles.listSongs}>
            {state === "loading" && <div className={styles.hint}>Loading your songs…</div>}

            {state === "error" && (
              <div className={styles.errorPanel}>
                <h2>{spotifyTrouble(result?.rateLimited, result?.retryAt).title}</h2>
                <p>
                  We couldn&apos;t load this list.{" "}
                  {spotifyTrouble(result?.rateLimited, result?.retryAt).body}
                </p>
                <button className={styles.smallButton} onClick={() => setReloadKey((k) => k + 1)}>
                  Retry
                </button>
              </div>
            )}

            {blockedUntil && (
              <p className={styles.hint}>
                Spotify is limiting this app until {moment(blockedUntil)}, so this is an older
                saved copy of the list.
              </p>
            )}

            {someUnchecked && (
              <div className={styles.notice}>
                <span>Some songs couldn&apos;t be checked for lyrics.</span>
                <button className={styles.smallButton} onClick={retry}>
                  Retry
                </button>
              </div>
            )}

            {tracks && tracks.length === 0 && (
              <div className={styles.hint}>{EMPTY[source] ?? "This playlist has no songs."}</div>
            )}

            {found && tracks!.length > 0 && found.length === 0 && (
              <div className={styles.hint}>No songs match “{search.trim()}”.</div>
            )}

            {found && found.length > 0 && shown!.length === 0 && (
              <NoFilterMatch onClear={() => setFilters(DEFAULT_FILTERS)} />
            )}

            {shown && shown.length > 0 && (
              <TrackList tracks={shown} statusOf={statusOf} from={source} />
            )}
          </section>
          {sidebar}
        </div>
      </div>
    </main>
  );
}
