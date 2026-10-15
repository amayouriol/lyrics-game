"use client";

import { useSearchParams } from "next/navigation";
import { usePlayer } from "./usePlayer";
import { useYouTubePlayer } from "./useYouTubePlayer";
import type { Player, PlayerOptions } from "./playerTypes";

/**
 * The player the game screens use. A song plays on YouTube when it has a
 * video, otherwise on Spotify. Both hooks are always called (hooks can't be
 * skipped); the one not in use stays idle.
 *
 * Step 2 of Phase 13: the video comes from a test link, `?yt=<video id>`.
 * Step 3 replaces it with the saved match for the song.
 */
export function usePlayback(options: PlayerOptions): Player {
  const testId = useSearchParams().get("yt");
  const videoId = testId && /^[\w-]{11}$/.test(testId) ? testId : null;

  const spotify = usePlayer({ ...options, enabled: !videoId });
  const youtube = useYouTubePlayer({ ...options, videoId, enabled: Boolean(videoId) });
  return videoId ? youtube : spotify;
}
