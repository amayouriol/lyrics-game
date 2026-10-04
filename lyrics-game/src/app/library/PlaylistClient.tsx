"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Source } from "@/lib/spotify";
import {
  fetchJson,
  type KeyedResult,
  type LibraryTrack,
  type LoadState,
} from "./libraryData";
import { useSaved } from "./SavedProvider";
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
export function PlaylistClient({ source }: { source: string }) {
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
  useEffect(() => {
    let ignore = false;
    fetchJson<{ tracks: LibraryTrack[] }>(
      `/api/library/tracks?source=${encodeURIComponent(source)}`
    ).then((r) => {
      if (ignore) return;
      if (r.status === "expired") {
        router.push("/?expired=1");
        return;
      }
      setResult(
        r.status === "error"
          ? { key: reloadKey, status: "error" }
          : { key: reloadKey, status: "ready", data: r.data.tracks }
      );
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
  const { statusOf, someUnchecked, retry } = useLyricsCheck(tracks, `${source}|${reloadKey}`);

  const count = tracks?.length ?? info?.count;

  return (
    <main className={styles.page}>
      <Link href="/library" className={`btn btn--ghost btn--sm ${styles.back}`}>
        All playlists
      </Link>

      <div className={styles.heading}>
        <h1>{SAVED_NAMES[source] ?? info?.name ?? (sources ? "Playlist" : "")}</h1>
        <p>
          {count !== undefined && `${count} ${count === 1 ? "song" : "songs"} · `}
          Pick a song. Anything without synced lyrics stays greyed out.
        </p>
      </div>

      {state === "loading" && <div className={styles.hint}>Loading your songs…</div>}

      {state === "error" && (
        <div className={styles.errorPanel}>
          <h2>Spotify didn&apos;t answer.</h2>
          <p>We couldn&apos;t load this list. It&apos;s probably a blip.</p>
          <button className="btn btn--secondary" onClick={() => setReloadKey((k) => k + 1)}>
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

      {tracks && tracks.length === 0 && (
        <div className={styles.hint}>{EMPTY[source] ?? "This playlist has no songs."}</div>
      )}

      {tracks && tracks.length > 0 && (
        <TrackList tracks={tracks} statusOf={statusOf} from={source} />
      )}
    </main>
  );
}
