"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Language } from "@/lib/language";
import type { LyricsStatus } from "@/lib/lyrics";
import { fetchJson, type LibraryTrack } from "./libraryData";

const CHECK_BATCH = 10;

/**
 * Checks a list's unchecked songs for synced lyrics in batches, updating as
 * each batch comes back. `listKey` changes whenever the list is reloaded;
 * `retry` runs the check again for songs that couldn't be checked.
 */
export function useLyricsCheck(tracks: LibraryTrack[] | null, listKey: string) {
  const router = useRouter();
  // Statuses found during this visit; they override the cached status each
  // track arrived with.
  const [statuses, setStatuses] = useState<Record<string, LyricsStatus>>({});
  const [languages, setLanguages] = useState<Record<string, Language | null>>({});
  const statusesRef = useRef(statuses);
  const [checkRound, setCheckRound] = useState(0);
  const [checkDoneFor, setCheckDoneFor] = useState<string | null>(null);
  const runKey = `${listKey}|${checkRound}`;

  useEffect(() => {
    statusesRef.current = statuses;
  }, [statuses]);

  useEffect(() => {
    if (!tracks) return;
    const pending = tracks.filter(
      (t) => (statusesRef.current[t.id] ?? t.lyricsStatus) === "unknown"
    );
    if (pending.length === 0) return;
    let cancelled = false;

    (async () => {
      for (let i = 0; i < pending.length; i += CHECK_BATCH) {
        const batch = pending.slice(i, i + CHECK_BATCH);
        const result = await fetchJson<{
          statuses: Record<string, LyricsStatus>;
          languages: Record<string, Language | null>;
        }>(
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
        setLanguages((prev) => ({ ...prev, ...result.data.languages }));
        // A batch where nothing could be checked looks like an outage; stop
        // here rather than wait on every remaining batch.
        if (Object.values(result.data.statuses).every((s) => s === "unknown")) break;
      }
      if (!cancelled) setCheckDoneFor(runKey);
    })();

    return () => {
      cancelled = true;
    };
  }, [tracks, runKey, router]);

  const statusOf = (t: LibraryTrack): LyricsStatus => statuses[t.id] ?? t.lyricsStatus;
  const languageOf = (t: LibraryTrack): Language | null =>
    t.id in languages ? languages[t.id] : t.language;
  const someUnchecked =
    checkDoneFor === runKey && Boolean(tracks?.some((t) => statusOf(t) === "unknown"));

  return { statusOf, languageOf, someUnchecked, retry: () => setCheckRound((r) => r + 1) };
}
