"use client";

import { useEffect, useState } from "react";
import type { VideoCandidate } from "@/lib/youtube";
import type { VideoMatch } from "@/lib/video-matches";
import type { TrackSummary } from "./loadSong";
import { VideoChoices } from "./VideoChoices";
import styles from "./song.module.css";

/** The video saved for a song: undefined while loading, null if none. */
export function useVideoMatch(trackId: string): [VideoMatch | null | undefined, (m: VideoMatch) => void] {
  const [match, setMatch] = useState<VideoMatch | null | undefined>(undefined);
  useEffect(() => {
    let ignore = false;
    fetch(`/api/video/${encodeURIComponent(trackId)}`)
      .then((res) => (res.ok ? res.json() : { match: null }))
      .then((body) => {
        if (!ignore) setMatch(body.match ?? null);
      })
      .catch(() => {
        if (!ignore) setMatch(null);
      });
    return () => {
      ignore = true;
    };
  }, [trackId]);
  return [match, setMatch];
}

/** What to say when searching for videos fails. */
export const SEARCH_ERRORS: Record<string, string> = {
  no_key: "Add YOUTUBE_API_KEY to .env.local to search for videos.",
  quota: "YouTube's free searches for today are used up. Try again tomorrow.",
  failed: "YouTube didn't answer. Try again.",
};

/** The browser's language region ("es-ES" → "ES"), a good guess of your country, or null. */
export function guessRegion(): string | null {
  try {
    return new Intl.Locale(navigator.language).region ?? null;
  } catch {
    return null;
  }
}

/** The chosen video for a song, and a list of three to choose from. */
export function VideoPicker({
  trackId,
  track,
  match,
  onChoose,
}: {
  trackId: string;
  track: TrackSummary;
  match: VideoMatch | null | undefined;
  onChoose: (match: VideoMatch) => void;
}) {
  const [open, setOpen] = useState(false);
  const [videos, setVideos] = useState<VideoCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const find = async () => {
    setOpen(true);
    setError(null);
    setVideos(null);
    const query = new URLSearchParams({
      title: track.title,
      artist: track.primaryArtist,
      durationMs: String(track.durationMs),
    });
    const region = guessRegion();
    if (region) query.set("region", region);
    try {
      const res = await fetch(`/api/video/${encodeURIComponent(trackId)}/search?${query}`);
      const body = await res.json();
      if (!res.ok) setError(SEARCH_ERRORS[body.error] ?? SEARCH_ERRORS.failed);
      else setVideos(body.videos);
    } catch {
      setError(SEARCH_ERRORS.failed);
    }
  };

  const save = async (video: VideoCandidate) => {
    const res = await fetch(`/api/video/${encodeURIComponent(trackId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId: video.videoId, title: video.title, channel: video.channel }),
    });
    if (!res.ok) throw new Error("save failed");
    onChoose((await res.json()).match);
    setOpen(false);
  };

  return (
    <div className={styles.videoBox}>
      {match === undefined ? null : match ? (
        <div className={styles.videoCurrent}>
          <div>
            <strong>{match.title}</strong>
            <small>{match.channel}</small>
          </div>
          {!open && (
            <button type="button" className={styles.change} onClick={find}>
              Choose another video
            </button>
          )}
        </div>
      ) : (
        !open && (
          <div className={styles.videoCurrent}>
            <div>
              <strong>No video chosen for this song yet.</strong>
              <small>Pick one once and it&apos;s remembered.</small>
            </div>
            <button type="button" className={styles.panelButton} onClick={find}>
              Find a video
            </button>
          </div>
        )
      )}

      {open && (
        <div className={styles.videoList}>
          {!videos && !error && <p className={styles.small}>Looking on YouTube…</p>}
          {error && <p className={styles.small}>{error}</p>}
          {videos && <VideoChoices videos={videos} onChosen={save} />}
          <button type="button" className={styles.change} onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}
