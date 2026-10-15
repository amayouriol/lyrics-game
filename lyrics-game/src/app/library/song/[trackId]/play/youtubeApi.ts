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

export interface PlayerSetup {
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

interface YTNamespace {
  Player: new (element: HTMLElement, options: PlayerSetup) => YTPlayer;
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

/** Messages between the game page and /yt-frame (see below). */
export const FRAME_TAG = "lyric-drop-yt";

/** An address that is a number (127.0.0.1) or the machine's own name. */
export function isLoopbackHost(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname === "[::1]" || hostname === "localhost";
}

/**
 * YouTube refuses to play videos on a page whose address is a number
 * (tested 2026-10-14: every video answered error 150 on 127.0.0.1, while the
 * same videos played on localhost). Spotify's login needs the app on
 * 127.0.0.1, so there the player runs in a small page served from
 * "localhost" (/yt-frame) inside this one, and the two talk by messages.
 */
function needsFrame(): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(window.location.hostname) || window.location.hostname === "[::1]";
}

/** A YouTube player that works whatever the page's address. Events arrive as with YouTube's own. */
export async function createPlayer(slot: HTMLElement, setup: PlayerSetup): Promise<YTPlayer> {
  if (!needsFrame()) {
    const YT = await loadYouTubeApi();
    return new YT.Player(slot, setup);
  }
  return createFramedPlayer(slot, setup);
}

function createFramedPlayer(slot: HTMLElement, setup: PlayerSetup): YTPlayer {
  const { protocol, port } = window.location;
  const frameOrigin = `${protocol}//localhost${port ? `:${port}` : ""}`;
  const query = new URLSearchParams({
    v: setup.videoId,
    parent: window.location.origin,
    autoplay: String(setup.playerVars.autoplay ?? 0),
    controls: String(setup.playerVars.controls ?? 0),
  });
  const frame = document.createElement("iframe");
  frame.src = `${frameOrigin}/yt-frame?${query}`;
  frame.width = String(setup.width);
  frame.height = String(setup.height);
  frame.allow = "autoplay; encrypted-media";
  frame.style.cssText = "border:0;display:block;max-width:100%;background:#000;";
  slot.appendChild(frame);

  let state: number = YT_STATE.unstarted;
  let time = 0;
  let timeAt = performance.now();
  let duration = 0;
  let videoId = "";

  const player: YTPlayer = {
    playVideo: () => send("play"),
    pauseVideo: () => send("pause"),
    // The page sends the time every 100 ms; between messages it keeps counting.
    getCurrentTime: () => (state === YT_STATE.playing ? time + (performance.now() - timeAt) / 1000 : time),
    getDuration: () => duration,
    getPlayerState: () => state,
    getVideoData: () => ({ video_id: videoId }),
    destroy: () => {
      window.removeEventListener("message", onMessage);
      frame.remove();
    },
  };

  function send(cmd: "play" | "pause") {
    frame.contentWindow?.postMessage({ source: FRAME_TAG, cmd }, frameOrigin);
  }

  function onMessage(e: MessageEvent) {
    if (e.origin !== frameOrigin || e.source !== frame.contentWindow) return;
    const m = e.data as {
      source?: string;
      type?: string;
      state?: number;
      time?: number;
      duration?: number;
      videoId?: string;
      code?: number;
    } | null;
    if (!m || m.source !== FRAME_TAG) return;
    if (m.type === "ready") setup.events.onReady?.({ target: player, data: 0 });
    else if (m.type === "error") setup.events.onError?.({ target: player, data: m.code ?? 0 });
    else if (m.type === "autoplay-blocked") setup.events.onAutoplayBlocked?.({ target: player, data: 0 });
    else if (m.type === "state") {
      const changed = m.state !== state;
      state = m.state ?? state;
      time = m.time ?? time;
      timeAt = performance.now();
      duration = m.duration ?? duration;
      videoId = m.videoId ?? videoId;
      if (changed) setup.events.onStateChange?.({ target: player, data: state });
    }
  }
  window.addEventListener("message", onMessage);
  return player;
}
