"use client";

// YouTube's player script has no npm types and we add no packages, so this is
// the small part of its API the game uses.

const API_URL = "https://www.youtube.com/iframe_api";

export const YT_STATE = {
  unstarted: -1,
  ended: 0,
  playing: 1,
  paused: 2,
  buffering: 3,
  cued: 5,
} as const;

export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  getVideoData(): { video_id?: string };
  destroy(): void;
}

export interface YTEvent {
  target: YTPlayer;
  data: number;
}

interface YTNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      width: number;
      height: number;
      videoId: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady?: (e: YTEvent) => void;
        onStateChange?: (e: YTEvent) => void;
        onError?: (e: YTEvent) => void;
        onAutoplayBlocked?: (e: YTEvent) => void;
      };
    }
  ) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

/** Loads YouTube's player script once per page. */
export function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise<YTNamespace>((resolve, reject) => {
    window.onYouTubeIframeAPIReady = () => {
      if (window.YT) resolve(window.YT);
      else reject(new Error("YouTube player missing"));
    };
    const script = document.createElement("script");
    script.src = API_URL;
    script.async = true;
    script.onerror = () => {
      apiPromise = null; // let a later song try again
      reject(new Error("YouTube player script failed to load"));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}
