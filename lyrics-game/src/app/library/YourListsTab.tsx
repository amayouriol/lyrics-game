"use client";

import Link from "next/link";
import { ArrowIcon, NoteIcon } from "@/components/icons";
import { playlistHref } from "./libraryData";
import type { OwnLists } from "./useOwnLists";
import styles from "./library.module.css";

/** Your lists as cards: "Added songs", imported playlists and the lists you make. */
export function YourListsTab({ lists }: { lists: OwnLists }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeading}>
        <div>
          <p>Added by you</p>
          <h2>Your lists</h2>
        </div>
      </div>

      {lists.status === "loading" && <p className={styles.hint}>Loading your lists…</p>}

      {lists.status === "error" && (
        <div className={styles.errorPanel}>
          <h2>Your lists didn&apos;t load.</h2>
          <p>It&apos;s probably a blip.</p>
          <button className={styles.smallButton} onClick={lists.reload}>
            Retry
          </button>
        </div>
      )}

      {lists.status === "ready" && lists.sources.length === 0 && (
        <p className={styles.hint}>
          Nothing here yet. Add a song with the box above, and your songs show up here as cards.
        </p>
      )}

      {lists.status === "ready" && lists.sources.length > 0 && (
        <div className={styles.cards}>
          {lists.sources.map((source) => (
            <Link key={source.id} href={playlistHref(source.id)} className={styles.card}>
              <span
                className={`${styles.cardCover} ${source.cover ? "" : styles.tile_playlist}`}
                style={source.cover ? { backgroundImage: `url(${source.cover})` } : undefined}
              >
                {!source.cover && <NoteIcon />}
              </span>
              <span className={styles.cardText}>
                <strong>{source.name}</strong>
                <small>
                  {source.count} {source.count === 1 ? "song" : "songs"}
                </small>
              </span>
              <i className={styles.cardArrow}>
                <ArrowIcon />
              </i>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
