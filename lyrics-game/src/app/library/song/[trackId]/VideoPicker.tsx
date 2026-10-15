"use client";

import { useEffect, useRef, useState } from "react";
import type { VideoCandidate, VideoWarning } from "@/lib/youtube";
import type { VideoMatch } from "@/lib/video-matches";
import { loadYouTubeApi, type YTPlayer } from "./play/youtubeApi";
import type { TrackSummary } from "./loadSong";
import styles from "./song.module.css";

type Check = "ok" | "unavailable" | "failed";
/** YouTube reports a video that can't be embedded within about half a second of loading. */
const SETTLE_MS = 1_200;
const GIVE_UP_MS = 10_000;

/**
 * Loads a video in a visible player, without playing it, to see if YouTube
 * allows it here. YouTube's own "embeddable" flag isn't always right (tested
 * 2026-10-14: a flagged video still answered error 150), so this is the real
 * check, made before a choice is saved.
 */
function VideoCheck({ videoId, onResult }: { videoId: string; onResult: (result: Check) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const report = useRef(onResult);
  useEffect(() => {
    report.current = onResult;
  }, [onResult]);

  useEffect(() => {
    let finished = false;
    let player: YTPlayer | null = null;
    let settle: ReturnType<typeof setTimeout> | undefined;
    const finish = (result: Check) => {
      if (finished) return;
      finished = true;
      clearTimeout(settle);
      clearTimeout(giveUp);
      report.current(result);
    };

    const slot = document.createElement("div");
    box.current?.appendChild(slot);
    const giveUp = setTimeout(() => finish("failed"), GIVE_UP_MS);
    loadYouTubeApi()
      .then((YT) => {
        if (finished) return;
        player = new YT.Player(slot, {
          width: 356,
          height: 200,
          videoId,
          playerVars: { controls: 0, disablekb: 1, rel: 0, playsinline: 1, origin: window.location.origin },
          events: {
            onReady: () => {
              settle = setTimeout(() => finish("ok"), SETTLE_MS);
            },
            onError: (e) => finish(e.data === 5 ? "failed" : "unavailable"),
          },
        });
      })
      .catch(() => finish("failed"));

    return () => {
      finished = true;
      clearTimeout(settle);
      clearTimeout(giveUp);
      try {
        player?.destroy();
      } catch {
        // Not finished loading.
      }
    };
  }, [videoId]);

  return <div ref={box} className={styles.videoCheck} />;
}

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
  const [checking, setChecking] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  /** Videos YouTube refused to play here, found by the check. */
  const [refused, setRefused] = useState<string[]>([]);

  const find = async () => {
    setOpen(true);
    setError(null);
    setVideos(null);
    setChecking(null);
    const query = new URLSearchParams({
      title: track.title,
      artist: track.primaryArtist,
      durationMs: String(track.durationMs),
    });
    // The browser's language region ("es-ES" → "ES") is a good guess of your country.
    const region = new Intl.Locale(navigator.language).region;
    if (region) query.set("region", region);
    try {
      const res = await fetch(`/api/video/${encodeURIComponent(trackId)}/search?${query}`);
      const body = await res.json();
      if (!res.ok) setError(ERRORS[body.error] ?? ERRORS.failed);
      else setVideos(body.videos);
    } catch {
      setError(ERRORS.failed);
    }
  };

  const choose = (video: VideoCandidate) => {
    setError(null);
    setChecking(video.videoId);
  };

  const checked = (video: VideoCandidate, result: Check) => {
    setChecking(null);
    if (result === "ok") return save(video);
    if (result === "unavailable") setRefused((r) => [...r, video.videoId]);
    else setError("Couldn't check that video. Try again.");
  };

  const save = async (video: VideoCandidate) => {
    setSaving(video.videoId);
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
                {refused.includes(video.videoId) && (
                  <span className={styles.videoWarn}>This one can&apos;t be played here. Try another.</span>
                )}
              </div>
              <button
                type="button"
                className={styles.panelButton}
                disabled={saving !== null || checking !== null || refused.includes(video.videoId)}
                onClick={() => choose(video)}
              >
                {checking === video.videoId ? "Checking…" : "Use this video"}
              </button>
              {checking === video.videoId && (
                <VideoCheck videoId={video.videoId} onResult={(result) => checked(video, result)} />
              )}
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
