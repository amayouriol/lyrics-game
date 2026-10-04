import Link from "next/link";
import type { LyricsStatus } from "@/lib/lyrics";
import type { LibraryTrack } from "./libraryData";
import { songHref } from "./song/[trackId]/loadSong";
import { SaveButtons, songToSave } from "./SaveButtons";
import styles from "./library.module.css";

/**
 * Song rows. Available songs open the song screen and get the Favorites /
 * Play later buttons (beside the link, not inside it). Songs still being
 * checked open too, since the song screen fetches its own lyrics, so you
 * don't wait for the whole list. Songs without lyrics can't be clicked.
 */
export function TrackList({
  tracks,
  statusOf,
  from,
  compact = false,
}: {
  tracks: LibraryTrack[];
  statusOf: (t: LibraryTrack) => LyricsStatus;
  /** The list these songs came from, so "Back to library" returns to it (null: the cards page). */
  from: string | null;
  /** For a narrow column: no number, length or "Synced lyrics" tag. */
  compact?: boolean;
}) {
  return (
    <div className={`${styles.tracks} ${compact ? styles.tracksCompact : ""}`}>
      {tracks.map((track, index) => {
        const status = statusOf(track);
        const row = (
          <>
            {!compact && <span className={styles.trackN}>{index + 1}</span>}
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
            {status === "available" && !compact && (
              <span className="chip chip--secondary chip--sm">Synced lyrics</span>
            )}
            {status === "unavailable" && (
              <span className={styles.unavailableNote}>Lyrics not available</span>
            )}
            {status === "unknown" && <span className={styles.checkingNote}>Checking…</span>}
            {!compact && <span className={styles.trackDur}>{track.duration}</span>}
          </>
        );
        // The same song can appear twice in a playlist.
        const key = `${track.id}-${index}`;

        if (status !== "unavailable") {
          return (
            <div key={key} className={`${styles.track} ${styles.trackAvailable}`}>
              <Link href={songHref(track.id, from)} className={styles.trackMain}>
                {row}
              </Link>
              {status === "available" ? <SaveButtons song={songToSave(track)} /> : <span />}
            </div>
          );
        }
        return (
          <div
            key={key}
            className={`${styles.track} ${styles.trackUnavailable}`}
            title="Lyrics not available"
          >
            <div className={styles.trackMain}>{row}</div>
            <span />
          </div>
        );
      })}
    </div>
  );
}
