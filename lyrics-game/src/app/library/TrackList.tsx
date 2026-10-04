import Link from "next/link";
import type { LyricsStatus } from "@/lib/lyrics";
import type { LibraryTrack } from "./libraryData";
import styles from "./library.module.css";

/** Song rows: available songs open the song screen, the rest can't be clicked. */
export function TrackList({
  tracks,
  statusOf,
  from,
}: {
  tracks: LibraryTrack[];
  statusOf: (t: LibraryTrack) => LyricsStatus;
  /** The list these songs came from, so "Back to library" returns to it. */
  from: string;
}) {
  return (
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
              href={`/library/song/${track.id}?from=${encodeURIComponent(from)}`}
              className={`${styles.track} ${styles.trackAvailable}`}
            >
              {row}
            </Link>
          );
        }
        return (
          <div
            key={key}
            className={`${styles.track} ${status === "unavailable" ? styles.trackUnavailable : ""}`}
            title={status === "unavailable" ? "Lyrics not available" : undefined}
          >
            {row}
          </div>
        );
      })}
    </div>
  );
}
