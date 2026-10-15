"use client";

import { usePlayer } from "./usePlayer";
import { useYouTubePlayer } from "./useYouTubePlayer";
import type { Player, PlayerOptions } from "./playerTypes";

/**
 * The player the game screens use. A song plays on YouTube when it has a
 * video, otherwise on Spotify. Both hooks are always called (hooks can't be
 * skipped); the one not in use stays idle.
 */
export function usePlayback(options: PlayerOptions): Player {
  const videoId = options.videoId ?? null;
  const spotify = usePlayer({ ...options, enabled: !videoId });
  const youtube = useYouTubePlayer({ ...options, videoId, enabled: Boolean(videoId) });
  return videoId ? youtube : spotify;
}
