"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJson, type KeyedResult, type LibraryTrack, type LoadState } from "./libraryData";

export interface WholeLibrary {
  /** Every song in Liked Songs and your playlists, each once. */
  tracks: LibraryTrack[];
  /** Names of playlists that couldn't be loaded. */
  failed: string[];
  /** Some of them because Spotify asked to slow down. */
  rateLimited: boolean;
}

/**
 * Your whole library, loaded once when the main library page opens (it
 * takes a few seconds) and shared by the total, the song of the day and
 * the search column.
 */
export function useWholeLibrary() {
  const router = useRouter();
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<KeyedResult<WholeLibrary> | null>(null);

  useEffect(() => {
    let ignore = false;
    fetchJson<WholeLibrary>("/api/library/all").then((r) => {
      if (ignore) return;
      if (r.status === "expired") {
        router.push("/?expired=1");
        return;
      }
      setResult(
        r.status === "error"
          ? { key: reloadKey, status: "error", rateLimited: r.rateLimited, retryAt: r.retryAt }
          : { key: reloadKey, status: "ready", data: r.data }
      );
    });
    return () => {
      ignore = true;
    };
  }, [reloadKey, router]);

  const state: LoadState = !result || result.key !== reloadKey ? "loading" : result.status;
  return {
    state,
    library: state === "ready" ? result!.data! : null,
    rateLimited: Boolean(result?.rateLimited),
    retryAt: result?.retryAt,
    reload: () => setReloadKey((k) => k + 1),
  };
}
