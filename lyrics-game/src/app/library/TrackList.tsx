import Link from "next/link";
import { PlayIcon } from "@/components/icons";
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
}: {
  tracks: LibraryTrack[];
  statusOf: (t: LibraryTrack) => LyricsStatus;
  /** The list these songs came from, so "Back to library" returns to it (null: the main page). */
  from: string | null;
}) {
  return (
    <div className={styles.tracks}>
      <div className={styles.tracksHeading} aria-hidden="true">
        <span>
          {tracks.length} {tracks.length === 1 ? "song" : "songs"}
        </span>
        <span>Save</span>
      </div>
      {tracks.map((track, index) => {
        const status = statusOf(track);
        const row = (
          <>
            <span className={styles.trackN}>{String(index + 1).padStart(2, "0")}</span>
            <span
              className={styles.trackCover}
              style={
                track.cover && status !== "unavailable"
                  ? { backgroundImage: `url(${track.cover})` }
                  : undefined
              }
            />
            <span className={styles.trackInfo}>
              <strong>{track.title}</strong>
              <small>{track.artist}</small>
            </span>
            {status === "available" && <span className={styles.tag}>Synced lyrics</span>}
            {status === "unavailable" && (
              <span className={`${styles.tag} ${styles.tagOff}`}>Lyrics not available</span>
            )}
            {status === "unknown" && <span className={styles.checking}>Checking…</span>}
            <span className={styles.trackDur}>{track.duration}</span>
            {status !== "unavailable" && (
              <span className={styles.start}>
                Start game
                <PlayIcon />
              </span>
            )}
          </>
        );
        // The same song can appear twice in a playlist.
        const key = `${track.id}-${index}`;

        if (status !== "unavailable") {
          return (
            <div key={key} className={styles.track}>
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
