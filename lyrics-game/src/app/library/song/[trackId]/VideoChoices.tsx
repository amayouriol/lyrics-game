"use client";

import { useEffect, useRef, useState } from "react";
import type { VideoCandidate, VideoWarning } from "@/lib/youtube";
import { createPlayer, type YTPlayer } from "./play/youtubeApi";
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
    createPlayer(slot, {
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
    })
      .then((created) => {
        if (finished) created.destroy();
        else player = created;
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

const WARNINGS: Record<VideoWarning, string> = {
  lyrics: "Looks like a lyrics video. The words may show on screen.",
  version: "Looks like a live, cover or remixed version.",
  length: "A different length from the song.",
};

function minutes(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * A short list of videos to choose from. "Use this video" first checks that
 * the video plays here, then hands it to `onChosen` (which saves it; if that
 * throws, the list says so and the choice can be tried again).
 */
export function VideoChoices({
  videos,
  onChosen,
}: {
  videos: VideoCandidate[];
  onChosen: (video: VideoCandidate) => Promise<void>;
}) {
  const [checking, setChecking] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  /** Videos YouTube refused to play here, found by the check. */
  const [refused, setRefused] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const checked = async (video: VideoCandidate, result: Check) => {
    setChecking(null);
    if (result === "unavailable") return setRefused((r) => [...r, video.videoId]);
    if (result === "failed") return setError("Couldn't check that video. Try again.");
    setSaving(video.videoId);
    try {
      await onChosen(video);
    } catch {
      setError("Couldn't save your choice. Try again.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      {error && <p className={styles.small}>{error}</p>}
      {videos.length === 0 && <p className={styles.small}>No videos found.</p>}
      {videos.map((video) => (
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
            onClick={() => {
              setError(null);
              setChecking(video.videoId);
            }}
          >
            {checking === video.videoId ? "Checking…" : saving === video.videoId ? "Saving…" : "Use this video"}
          </button>
          {checking === video.videoId && (
            <VideoCheck videoId={video.videoId} onResult={(result) => checked(video, result)} />
          )}
        </div>
      ))}
    </>
  );
}
