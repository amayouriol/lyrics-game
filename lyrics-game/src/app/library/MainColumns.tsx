"use client";

import { useState } from "react";
import Link from "next/link";
import { BookmarkIcon, HeartIcon } from "@/components/icons";
import type { SavedListName } from "@/lib/saved";
import { playlistHref, type LoadState } from "./libraryData";
import { useSaved } from "./SavedProvider";
import { playHref, songHref } from "./song/[trackId]/loadSong";
import type { WholeLibrary } from "./useWholeLibrary";
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

/** A number from today's date, so the song of the day holds until midnight. */
function today(): number {
  const d = new Date();
  return d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate();
}

/**
 * A random song from your library that has synced lyrics and you've never
 * finished: the same all day, a new one tomorrow. "Another one" moves on.
 */
export function SongOfTheDay({
  state,
  library,
}: {
  state: LoadState;
  library: WholeLibrary | null;
}) {
  const [skip, setSkip] = useState(0);
  const [day] = useState(today);

  const candidates = library
    ? library.tracks
        .filter((t) => t.lyricsStatus === "available" && !t.played)
        .sort((a, b) => a.id.localeCompare(b.id))
    : [];
  // Spread consecutive days across the list rather than walking it in order.
  const song = candidates.length
    ? candidates[(day * 7919 + skip) % candidates.length]
    : null;

  return (
    <section className={`${styles.column} ${styles.column_day}`}>
      <div className={styles.columnTitle}>
        <span>Song of the day</span>
      </div>

      {state === "loading" && <p className={styles.panelHint}>Picking a song…</p>}
      {state === "error" && <p className={styles.panelHint}>Couldn&apos;t pick a song today.</p>}
      {library && !song && (
        <p className={styles.panelHint}>
          You&apos;ve played every song in your library that has lyrics. Impressive.
        </p>
      )}

      {song && (
        <>
          <Link href={songHref(song.id, null)} className={styles.daySong}>
            <div
              className={styles.dayCover}
              style={song.cover ? { backgroundImage: `url(${song.cover})` } : undefined}
            />
            <div className={styles.trackInfo}>
              <span className={styles.panelSongTitle}>{song.title}</span>
              <span className={styles.trackArtist}>{song.artist}</span>
            </div>
          </Link>
          <div className={styles.dayActions}>
            <Link href={playHref(song.id, null, "medium")} className="btn btn--sm">
              Play
            </Link>
            {candidates.length > 1 && (
              <button className="btn btn--ghost btn--sm" onClick={() => setSkip((s) => s + 1)}>
                Another one
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
