"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { BookmarkIcon, HeartIcon } from "@/components/icons";
import type { SavedListName, SavedSong } from "@/lib/saved";
import { playlistHref } from "./libraryData";
import { useSaved } from "./SavedProvider";
import styles from "./library.module.css";

// Whether you hid the panel, kept in this browser. Storage can be blocked
// (private windows, cleared site data): then the panel just shows.
const HIDDEN_KEY = "lyrics-game:saved-panel-hidden";
const listeners = new Set<() => void>();
/** Set once you hide or show it, so it holds even when storage is blocked. */
let memoryHidden: boolean | null = null;

function readHidden(): boolean {
  try {
    return window.localStorage.getItem(HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

function setHidden(hidden: boolean) {
  try {
    window.localStorage.setItem(HIDDEN_KEY, hidden ? "1" : "0");
  } catch {
    // Not remembered; it still hides for now.
  }
  memoryHidden = hidden;
  listeners.forEach((l) => l());
}

function useHidden(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => memoryHidden ?? readHidden(),
    () => false
  );
}

const SECTIONS: { list: SavedListName; title: string; empty: string }[] = [
  { list: "favorites", title: "Favorites", empty: "Use the heart on any song to keep it here." },
  { list: "later", title: "Play later", empty: "Bookmark songs to build your queue." },
];

/** Favorites and Play later, beside a list's songs: the app's own lists, not Spotify's. */
export function SavedPanel() {
  const hidden = useHidden();
  const { lists, failed, reload } = useSaved();

  if (hidden) {
    return (
      <button className={styles.panelTab} onClick={() => setHidden(false)} aria-label="Show saved songs">
        <HeartIcon />
        <span>Saved</span>
      </button>
    );
  }

  return (
    <aside className={styles.panel} aria-label="Saved in Lyric Drop">
      <div className={styles.panelHead}>
        <div>
          <p>Saved in Lyric Drop</p>
          <h2>Your game library</h2>
        </div>
        <div className={styles.panelHeadRight}>
          {lists && <span>{lists.favorites.length + lists.later.length}</span>}
          <button className={styles.panelHide} onClick={() => setHidden(true)}>
            Hide
          </button>
        </div>
      </div>

      {!lists && !failed && <p className={styles.panelHint}>Loading…</p>}

      {failed && (
        <div className={styles.panelHint}>
          <p>Your saved songs didn&apos;t load.</p>
          <button className={styles.smallButton} onClick={reload}>
            Retry
          </button>
        </div>
      )}

      {lists &&
        SECTIONS.map(({ list, title, empty }) => (
          <section key={list} className={styles.panelSection}>
            <Link href={playlistHref(list)} className={styles.panelTitle}>
              {list === "favorites" ? <HeartIcon filled /> : <BookmarkIcon filled />}
              <span>{title}</span>
              <b>{lists[list].length}</b>
            </Link>
            {lists[list].length === 0 ? (
              <p className={styles.panelHint}>{empty}</p>
            ) : (
              <div className={styles.panelSongs}>
                {lists[list].map((song) => (
                  <PanelSong key={song.id} song={song} from={list} />
                ))}
              </div>
            )}
          </section>
        ))}
    </aside>
  );
}

function PanelSong({ song, from }: { song: SavedSong; from: SavedListName }) {
  return (
    <Link href={`/library/song/${song.id}?from=${from}`} className={styles.panelSong}>
      <span
        className={styles.cover}
        style={song.cover ? { backgroundImage: `url(${song.cover})` } : undefined}
      />
      <span className={styles.songText}>
        <strong>{song.title}</strong>
        <small>{song.artist}</small>
      </span>
    </Link>
  );
}
