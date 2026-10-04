"use client";

import { useEffect, useState } from "react";
import { BookmarkIcon, HeartIcon } from "@/components/icons";
import type { SavedListName } from "@/lib/saved";
import { useSaved, type SongToSave } from "./SavedProvider";
import styles from "./library.module.css";

const LABELS: Record<SavedListName, [string, string]> = {
  favorites: ["Add to Favorites", "Remove from Favorites"],
  later: ["Save to Play later", "Remove from Play later"],
};

/** The heart (Favorites) and bookmark (Play later) for one song. */
export function SaveButtons({ song, size = "sm" }: { song: SongToSave; size?: "sm" | "lg" }) {
  const { lists, toggle } = useSaved();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!failed) return;
    const t = setTimeout(() => setFailed(false), 3_000);
    return () => clearTimeout(t);
  }, [failed]);

  async function click(list: SavedListName, on: boolean) {
    setFailed(false);
    if (!(await toggle(list, song, on))) setFailed(true);
  }

  return (
    <div className={`${styles.saveButtons} ${size === "lg" ? styles.saveButtonsLg : ""}`}>
      {(["favorites", "later"] as const).map((list) => {
        const on = Boolean(lists?.[list].some((s) => s.id === song.id));
        const label = LABELS[list][on ? 1 : 0];
        return (
          <button
            key={list}
            type="button"
            className={`${styles.saveButton} ${on ? styles[`saveOn_${list}`] : ""}`}
            aria-pressed={on}
            aria-label={label}
            title={label}
            // Until your lists load, it isn't known which are already saved.
            disabled={!lists}
            onClick={() => click(list, !on)}
          >
            {list === "favorites" ? <HeartIcon filled={on} /> : <BookmarkIcon filled={on} />}
          </button>
        );
      })}
      {failed && (
        <span className={styles.saveFailed} role="status">
          Couldn&apos;t save. Try again.
        </span>
      )}
    </div>
  );
}

/** What a song row or the song screen hands to the buttons. */
export function songToSave(t: SongToSave): SongToSave {
  const { id, title, artist, primaryArtist, album, durationMs, duration, cover } = t;
  return { id, title, artist, primaryArtist, album, durationMs, duration, cover };
}
