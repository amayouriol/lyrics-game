"use client";

import Link from "next/link";
import { BookmarkIcon, HeartIcon } from "@/components/icons";
import type { SavedListName } from "@/lib/saved";
import { playlistHref } from "./libraryData";
import { useSaved } from "./SavedProvider";
import { songHref } from "./song/[trackId]/loadSong";
import styles from "./library.module.css";

/** Songs shown per column; "See all" opens the full list. */
const COLUMN_SONGS = 5;

const COLUMNS: Record<SavedListName, { title: string; empty: string }> = {
  favorites: { title: "Favorites", empty: "Use the heart on any song to keep it here." },
  later: { title: "Play later", empty: "Use the bookmark on any song to keep it here." },
};

/** Favorites or Play later on the main page: the newest few, and a link to all. */
export function SavedColumn({ list }: { list: SavedListName }) {
  const { lists, failed, reload } = useSaved();
  const songs = lists?.[list] ?? [];
  const { title, empty } = COLUMNS[list];

  return (
    <section className={`${styles.column} ${styles[`column_${list}`]}`}>
      <Link href={playlistHref(list)} className={styles.columnTitle}>
        {list === "favorites" ? <HeartIcon filled /> : <BookmarkIcon filled />}
        <span>{title}</span>
        {lists && <span className={styles.count}>{songs.length}</span>}
      </Link>

      {!lists && !failed && <p className={styles.panelHint}>Loading…</p>}
      {failed && (
        <div className={styles.panelHint}>
          <p>Your saved songs didn&apos;t load.</p>
          <button className="btn btn--secondary btn--sm" onClick={reload}>
            Retry
          </button>
        </div>
      )}
      {lists && songs.length === 0 && <p className={styles.panelHint}>{empty}</p>}

      {songs.length > 0 && (
        <div className={styles.panelSongs}>
          {songs.slice(0, COLUMN_SONGS).map((song) => (
            <Link key={song.id} href={songHref(song.id, list)} className={styles.panelSong}>
              <div
                className={styles.panelCover}
                style={song.cover ? { backgroundImage: `url(${song.cover})` } : undefined}
              />
              <div className={styles.trackInfo}>
                <span className={styles.panelSongTitle}>{song.title}</span>
                <span className={styles.trackArtist}>{song.artist}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
      {songs.length > COLUMN_SONGS && (
        <Link href={playlistHref(list)} className={styles.seeAll}>
          See all {songs.length}
        </Link>
      )}
    </section>
  );
}
