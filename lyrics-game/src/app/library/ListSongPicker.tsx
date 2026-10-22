"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchJson, matchesSearch, type LibraryTrack } from "./libraryData";
import { listIdOf, sendList } from "./listApi";
import { SearchBox } from "./SearchBox";
import styles from "./library.module.css";

/**
 * Songs you already have, to put into this list: tick some, then add them.
 * Songs already in the list can't be ticked again.
 */
export function ListSongPicker({
  source,
  inList,
  onAdded,
  onClose,
}: {
  /** The list's source id, "own:…". */
  source: string;
  /** Ids of the songs already in the list. */
  inList: Set<string>;
  onAdded: () => void;
  onClose: () => void;
}) {
  const [songs, setSongs] = useState<LibraryTrack[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    fetchJson<{ tracks: LibraryTrack[] }>("/api/own/songs").then((r) => {
      if (ignore) return;
      if (r.status === "ok") setSongs(r.data.tracks);
      else setFailed(true);
    });
    return () => {
      ignore = true;
    };
  }, []);

  const shown = useMemo(() => songs?.filter((t) => matchesSearch(t, search)) ?? null, [songs, search]);

  const toggle = (id: string) =>
    setTicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const add = async () => {
    if (busy || ticked.size === 0) return;
    setBusy(true);
    setProblem(null);
    const answer = await sendList(`/api/own/lists/${listIdOf(source)}/songs`, "POST", {
      songIds: [...ticked],
    });
    setBusy(false);
    if (!answer.ok) {
      setProblem(answer.message);
      return;
    }
    onAdded();
    onClose();
  };

  return (
    <div className={styles.addBox}>
      <h3>Add songs you already have</h3>
      {failed && <p className={styles.addError}>Your songs didn&apos;t load. Close this and try again.</p>}
      {!failed && songs === null && <p className={styles.hint}>Loading your songs…</p>}
      {songs && songs.length === 0 && (
        <p className={styles.hint}>
          You haven&apos;t added any songs yet. Use “Add from YouTube” to add one.
        </p>
      )}
      {songs && songs.length > 0 && (
        <>
          <SearchBox value={search} onChange={setSearch} placeholder="Search your songs" />
          <ul className={styles.pickList}>
            {shown?.map((track) => {
              const already = inList.has(track.id);
              return (
                <li key={track.id}>
                  <label className={`${styles.pickRow} ${already ? styles.pickDone : ""}`}>
                    <input
                      type="checkbox"
                      checked={already || ticked.has(track.id)}
                      disabled={already}
                      onChange={() => toggle(track.id)}
                    />
                    <span className={styles.pickInfo}>
                      <strong>{track.title}</strong>
                      <small>{track.artist}</small>
                    </span>
                    {already && <span className={styles.pickTag}>In this list</span>}
                  </label>
                </li>
              );
            })}
            {shown?.length === 0 && <li className={styles.hint}>No songs match “{search.trim()}”.</li>}
          </ul>
        </>
      )}
      {problem && (
        <p className={styles.addError} role="status">
          {problem}
        </p>
      )}
      <div className={styles.addRow}>
        <button className={styles.smallButton} onClick={add} disabled={busy || ticked.size === 0}>
          {busy ? "Adding…" : ticked.size === 0 ? "Add songs" : `Add ${ticked.size} ${ticked.size === 1 ? "song" : "songs"}`}
        </button>
        <button className={styles.linkButton} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
