"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LyricsStatus } from "@/lib/lyrics";
import type { Source, Track } from "@/lib/spotify";
import styles from "./library.module.css";

type LoadState = "loading" | "ready" | "error";
type FetchResult<T> = { status: "ok"; data: T } | { status: "expired" } | { status: "error" };
type LibraryTrack = Track & { lyricsStatus: LyricsStatus };

const CHECK_BATCH = 10;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<FetchResult<T>> {
  try {
    const res = await fetch(url, init);
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

export function LibraryClient({ initialSource }: { initialSource: string | null }) {
  const router = useRouter();

  const [sourcesReloadKey, setSourcesReloadKey] = useState(0);
  const [sourcesResult, setSourcesResult] = useState<KeyedResult<Source[]> | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(initialSource);

  const [tracksReloadKey, setTracksReloadKey] = useState(0);
  const [tracksResult, setTracksResult] = useState<
    (KeyedResult<LibraryTrack[]> & { source: string }) | null
  >(null);

  // Lyrics statuses found during this visit; they override the cached
  // status each track arrived with.
  const [statuses, setStatuses] = useState<Record<string, LyricsStatus>>({});
  const statusesRef = useRef(statuses);
  const [checkRound, setCheckRound] = useState(0);
  const [checkDoneFor, setCheckDoneFor] = useState<string | null>(null);

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
      const loaded = result.data.sources;
      setSourcesResult({ key: sourcesReloadKey, status: "ready", data: loaded });
      // Keep the list from the URL if it still exists, else show the first.
      setSelectedSource((prev) =>
        prev && loaded.some((s) => s.id === prev) ? prev : (loaded[0]?.id ?? null)
      );
    });

    return () => {
      ignore = true;
    };
  }, [sourcesReloadKey, router]);

  // Load the track list whenever the selected source changes, or on Retry.
  useEffect(() => {
    if (!selectedSource) return;
    let ignore = false;

    fetchJson<{ tracks: LibraryTrack[] }>(
      `/api/library/tracks?source=${encodeURIComponent(selectedSource)}`
    ).then((result) => {
      if (ignore) return;
      if (result.status === "expired") {
        router.push("/?expired=1");
        return;
      }
      if (result.status === "error") {
        setTracksResult({ key: tracksReloadKey, source: selectedSource, status: "error" });
        return;
      }
      setTracksResult({
        key: tracksReloadKey,
        source: selectedSource,
        status: "ready",
        data: result.data.tracks,
      });
    });

    return () => {
      ignore = true;
    };
  }, [selectedSource, tracksReloadKey, router]);

  useEffect(() => {
    statusesRef.current = statuses;
  }, [statuses]);

  // Once a list is showing, check its unchecked songs for synced lyrics in
  // batches, updating rows as each batch comes back. Retry re-runs this.
  useEffect(() => {
    if (
      !tracksResult ||
      tracksResult.status !== "ready" ||
      tracksResult.key !== tracksReloadKey ||
      tracksResult.source !== selectedSource
    ) {
      return;
    }
    const pending = tracksResult.data!.filter(
      (t) => (statusesRef.current[t.id] ?? t.lyricsStatus) === "unknown"
    );
    if (pending.length === 0) return;

    const runKey = `${selectedSource}|${tracksReloadKey}|${checkRound}`;
    let cancelled = false;

    (async () => {
      for (let i = 0; i < pending.length; i += CHECK_BATCH) {
        const batch = pending.slice(i, i + CHECK_BATCH);
        const result = await fetchJson<{ statuses: Record<string, LyricsStatus> }>(
          "/api/lyrics/check",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tracks: batch.map(({ id, title, primaryArtist, album, durationMs }) => ({
                id,
                title,
                primaryArtist,
                album,
                durationMs,
              })),
            }),
          }
        );
        if (cancelled) return;
        if (result.status === "expired") {
          router.push("/?expired=1");
          return;
        }
        if (result.status === "error") break;
        setStatuses((prev) => ({ ...prev, ...result.data.statuses }));
        // A batch where nothing could be checked looks like an outage; stop
        // here rather than wait on every remaining batch.
        if (Object.values(result.data.statuses).every((s) => s === "unknown")) break;
      }
      if (!cancelled) setCheckDoneFor(runKey);
    })();

    return () => {
      cancelled = true;
    };
  }, [tracksResult, selectedSource, tracksReloadKey, checkRound, router]);

  const sourcesState: LoadState =
    !sourcesResult || sourcesResult.key !== sourcesReloadKey ? "loading" : sourcesResult.status;
  const sources = sourcesState === "ready" ? sourcesResult!.data! : [];

  const tracksState: LoadState =
    !tracksResult ||
    tracksResult.key !== tracksReloadKey ||
    tracksResult.source !== selectedSource
      ? "loading"
      : tracksResult.status;
  const tracks = tracksState === "ready" ? tracksResult!.data! : [];

  const statusOf = (t: LibraryTrack) => statuses[t.id] ?? t.lyricsStatus;
  const checkFinished = checkDoneFor === `${selectedSource}|${tracksReloadKey}|${checkRound}`;
  const someUnchecked = checkFinished && tracks.some((t) => statusOf(t) === "unknown");

  const currentSource = sources.find((s) => s.id === selectedSource);

  function selectSource(id: string) {
    setSelectedSource(id);
    // So a refresh, or "Back to library" from a song, returns to this list.
    window.history.replaceState(null, "", `/library?source=${encodeURIComponent(id)}`);
  }

  return (
    <main className={styles.main}>
      <nav className={styles.sidebar}>
        <div className={styles.sidebarTitle}>Your library</div>
        <p className={styles.sidebarNote}>
          Only playlists you own — Spotify doesn&apos;t let apps read the tracks of playlists you
          just follow (like Discover Weekly).
        </p>

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
              onClick={() => selectSource(source.id)}
            >
              <span>{source.name}</span>
              <span className={styles.count}>{source.count}</span>
            </div>
          ))}
      </nav>

      <section className={styles.content}>
        <div className={styles.heading}>
          <h1>{currentSource?.name ?? ""}</h1>
          <p>Pick a song. Anything without synced lyrics stays greyed out.</p>
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

        {someUnchecked && (
          <div className={styles.notice}>
            <span>Some songs couldn&apos;t be checked for lyrics.</span>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => setCheckRound((r) => r + 1)}
            >
              Retry
            </button>
          </div>
        )}

        {tracksState === "ready" && (
          <div className={styles.tracks}>
            {tracks.map((track, index) => {
              const status = statusOf(track);
              const row = (
                <>
                  <span className={styles.trackN}>{index + 1}</span>
                  <div
                    className={styles.trackCover}
                    style={
                      track.cover && status !== "unavailable"
                        ? { backgroundImage: `url(${track.cover})` }
                        : undefined
                    }
                  />
                  <div className={styles.trackInfo}>
                    <span className={styles.trackTitle}>{track.title}</span>
                    <span className={styles.trackArtist}>{track.artist}</span>
                  </div>
                  {status === "available" && (
                    <span className="chip chip--secondary chip--sm">Synced lyrics</span>
                  )}
                  {status === "unavailable" && (
                    <span className={styles.unavailableNote}>Lyrics not available</span>
                  )}
                  {status === "unknown" && <span />}
                  <span className={styles.trackDur}>{track.duration}</span>
                </>
              );
              // The same song can appear twice in a playlist.
              const key = `${track.id}-${index}`;

              if (status === "available") {
                return (
                  <Link
                    key={key}
                    href={`/library/song/${track.id}?from=${encodeURIComponent(selectedSource ?? "")}`}
                    className={`${styles.track} ${styles.trackAvailable}`}
                  >
                    {row}
                  </Link>
                );
              }
              return (
                <div
                  key={key}
                  className={`${styles.track} ${
                    status === "unavailable" ? styles.trackUnavailable : ""
                  }`}
                  title={status === "unavailable" ? "Lyrics not available" : undefined}
                >
                  {row}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
