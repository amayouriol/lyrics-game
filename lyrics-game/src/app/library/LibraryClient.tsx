"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Source, Track } from "@/lib/spotify";
import styles from "./library.module.css";

type LoadState = "loading" | "ready" | "error";
type FetchResult<T> = { status: "ok"; data: T } | { status: "expired" } | { status: "error" };

async function fetchJson<T>(url: string): Promise<FetchResult<T>> {
  try {
    const res = await fetch(url);
    if (res.status === 401) return { status: "expired" };
    if (!res.ok) return { status: "error" };
    return { status: "ok", data: (await res.json()) as T };
  } catch {
    return { status: "error" };
  }
}

/** The result of the fetch tagged with the request key it answers, so a
 * component can tell "still loading this key" apart from "loaded a stale one". */
interface KeyedResult<T> {
  key: number;
  status: "ready" | "error";
  data?: T;
}

export function LibraryClient() {
  const router = useRouter();

  const [sourcesReloadKey, setSourcesReloadKey] = useState(0);
  const [sourcesResult, setSourcesResult] = useState<KeyedResult<Source[]> | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  const [tracksReloadKey, setTracksReloadKey] = useState(0);
  const [tracksResult, setTracksResult] = useState<KeyedResult<Track[]> | null>(null);

  // Load the sidebar (Liked Songs + playlists) once, and again on Retry.
  useEffect(() => {
    let ignore = false;

    fetchJson<{ sources: Source[] }>("/api/library/sources").then((result) => {
      if (ignore) return;
      if (result.status === "expired") {
        router.push("/?expired=1");
        return;
      }
      if (result.status === "error") {
        setSourcesResult({ key: sourcesReloadKey, status: "error" });
        return;
      }
      setSourcesResult({ key: sourcesReloadKey, status: "ready", data: result.data.sources });
      setSelectedSource((prev) => prev ?? result.data.sources[0]?.id ?? null);
    });

    return () => {
      ignore = true;
    };
  }, [sourcesReloadKey, router]);

  // Load the track list whenever the selected source changes, or on Retry.
  useEffect(() => {
    if (!selectedSource) return;
    let ignore = false;

    fetchJson<{ tracks: Track[] }>(
      `/api/library/tracks?source=${encodeURIComponent(selectedSource)}`
    ).then((result) => {
      if (ignore) return;
      if (result.status === "expired") {
        router.push("/?expired=1");
        return;
      }
      if (result.status === "error") {
        setTracksResult({ key: tracksReloadKey, status: "error" });
        return;
      }
      setTracksResult({ key: tracksReloadKey, status: "ready", data: result.data.tracks });
    });

    return () => {
      ignore = true;
    };
    // A source switch always starts a fresh load, so it belongs alongside
    // tracksReloadKey as a trigger for this effect.
  }, [selectedSource, tracksReloadKey, router]);

  const sourcesState: LoadState =
    !sourcesResult || sourcesResult.key !== sourcesReloadKey ? "loading" : sourcesResult.status;
  const sources = sourcesState === "ready" ? sourcesResult!.data! : [];

  const tracksState: LoadState =
    !tracksResult || tracksResult.key !== tracksReloadKey ? "loading" : tracksResult.status;
  const tracks = tracksState === "ready" ? tracksResult!.data! : [];

  const currentSource = sources.find((s) => s.id === selectedSource);

  return (
    <main className={styles.main}>
      <nav className={styles.sidebar}>
        <div className={styles.sidebarTitle}>Your library</div>

        {sourcesState === "loading" && <div className={styles.hint}>Loading…</div>}

        {sourcesState === "error" && (
          <div className={styles.errorBox}>
            <p>Spotify didn&apos;t answer.</p>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => setSourcesReloadKey((k) => k + 1)}
            >
              Retry
            </button>
          </div>
        )}

        {sourcesState === "ready" &&
          sources.map((source) => (
            <div
              key={source.id}
              className={`${styles.source} ${
                source.id === selectedSource ? styles.sourceActive : ""
              }`}
              onClick={() => setSelectedSource(source.id)}
            >
              <span>{source.name}</span>
              <span className={styles.count}>{source.count}</span>
            </div>
          ))}
      </nav>

      <section className={styles.content}>
        <div className={styles.heading}>
          <h1>{currentSource?.name ?? ""}</h1>
        </div>

        {tracksState === "loading" && <div className={styles.hint}>Loading your library…</div>}

        {tracksState === "error" && (
          <div className={styles.errorPanel}>
            <h2>Spotify didn&apos;t answer.</h2>
            <p>We couldn&apos;t load your playlists or liked songs. It&apos;s probably a blip.</p>
            <button
              className="btn btn--secondary"
              onClick={() => setTracksReloadKey((k) => k + 1)}
            >
              Retry
            </button>
          </div>
        )}

        {tracksState === "ready" && (
          <div className={styles.tracks}>
            {tracks.map((track, index) => (
              <div key={track.id} className={styles.track}>
                <span className={styles.trackN}>{index + 1}</span>
                <div
                  className={styles.trackCover}
                  style={track.cover ? { backgroundImage: `url(${track.cover})` } : undefined}
                />
                <div className={styles.trackInfo}>
                  <span className={styles.trackTitle}>{track.title}</span>
                  <span className={styles.trackArtist}>{track.artist}</span>
                </div>
                <span className={styles.trackDur}>{track.duration}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
