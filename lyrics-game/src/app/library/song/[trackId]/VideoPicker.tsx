"use client";

import { useEffect, useState } from "react";
import type { VideoCandidate, VideoWarning } from "@/lib/youtube";
import type { VideoMatch } from "@/lib/video-matches";
import type { TrackSummary } from "./loadSong";
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

const WARNINGS: Record<VideoWarning, string> = {
  lyrics: "Looks like a lyrics video. The words may show on screen.",
  version: "Looks like a live, cover or remixed version.",
  length: "A different length from the song.",
};

const ERRORS: Record<string, string> = {
  no_key: "Add YOUTUBE_API_KEY to .env.local to search for videos.",
  quota: "YouTube's free searches for today are used up. Try again tomorrow.",
  failed: "YouTube didn't answer. Try again.",
};

function minutes(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
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
  const [saving, setSaving] = useState<string | null>(null);

  const find = async () => {
    setOpen(true);
    setError(null);
    setVideos(null);
    const query = new URLSearchParams({
      title: track.title,
      artist: track.primaryArtist,
      durationMs: String(track.durationMs),
    });
    try {
      const res = await fetch(`/api/video/${encodeURIComponent(trackId)}/search?${query}`);
      const body = await res.json();
      if (!res.ok) setError(ERRORS[body.error] ?? ERRORS.failed);
      else setVideos(body.videos);
    } catch {
      setError(ERRORS.failed);
    }
  };

  const choose = async (video: VideoCandidate) => {
    setSaving(video.videoId);
    setError(null);
    try {
      const res = await fetch(`/api/video/${encodeURIComponent(trackId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: video.videoId, title: video.title, channel: video.channel }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error();
      onChoose(body.match);
      setOpen(false);
    } catch {
      setError("Couldn't save your choice. Try again.");
    } finally {
      setSaving(null);
    }
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
          {videos?.length === 0 && <p className={styles.small}>No videos found for this song.</p>}
          {videos?.map((video) => (
            <div key={video.videoId} className={styles.videoItem}>
              <div
                className={styles.videoThumb}
                style={video.thumbnail ? { backgroundImage: `url(${video.thumbnail})` } : undefined}
                aria-hidden="true"
              />
              <div className={styles.videoText}>
                <strong>{video.title}</strong>
                <small>
                  {video.channel} · {minutes(video.durationMs)}
                </small>
                {video.topic && <span className={styles.videoGood}>Cover picture only, a clean upload</span>}
                {video.warning && <span className={styles.videoWarn}>{WARNINGS[video.warning]}</span>}
              </div>
              <button
                type="button"
                className={styles.panelButton}
                disabled={saving !== null}
                onClick={() => choose(video)}
              >
                Use this video
              </button>
            </div>
          ))}
          <button type="button" className={styles.change} onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}
