"use client";

import { usePlayer } from "./usePlayer";
import type { Player, PlayerOptions } from "./playerTypes";

/**
 * The player the game screens use. Today every song plays through Spotify;
 * Phase 13 adds YouTube here, chosen by the song's source.
 */
export function usePlayback(options: PlayerOptions): Player {
  return usePlayer(options);
}
