"use client";

const SDK_URL = "https://sdk.scdn.co/spotify-player.js";

export type PlayerError = "permissions" | "premium" | "unsupported" | "start_failed";

/**
 * The page's one Spotify player. Spotify only registers the first player a
 * page creates: tested 2026-10-03, every later instance got a device id that
 * Spotify answered "Device not found" for. So songs reuse this player, and
 * leaving a song pauses it rather than disconnecting.
 */
export interface SharedPlayer {
  player: Spotify.Player;
  /** Set once Spotify reports the player ready; cleared if it goes offline. */
  deviceId: string | null;
  connectStarted: boolean;
  /** A setup failure that makes this player unusable until the page reloads. */
  failure: PlayerError | null;
}

let sdkPromise: Promise<void> | null = null;
let shared: SharedPlayer | null = null;

/** Loads Spotify's player script once per page. */
function loadSdk(): Promise<void> {
  if ("Spotify" in window && window.Spotify) return Promise.resolve();
  sdkPromise ??= new Promise<void>((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onerror = () => {
      sdkPromise = null;
      script.remove();
      reject(new Error("Could not load Spotify's player script"));
    };
    document.body.appendChild(script);
  });
  return sdkPromise;
}

export async function fetchToken(): Promise<
  { accessToken: string; missingScopes: string[] } | "expired" | null
> {
  try {
    const res = await fetch("/api/player/token");
    if (res.status === 401) return "expired";
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/** Returns the page's player, creating it (not yet connected) the first time. */
export async function getSharedPlayer(): Promise<SharedPlayer> {
  await loadSdk();
  if (shared) return shared;

  const player = new window.Spotify.Player({
    name: "Lyrics Game",
    volume: 0.8,
    getOAuthToken: (cb) => {
      fetchToken().then((t) => {
        if (t && t !== "expired") cb(t.accessToken);
      });
    },
  });
  const created: SharedPlayer = { player, deviceId: null, connectStarted: false, failure: null };

  player.addListener("ready", ({ device_id }) => {
    created.deviceId = device_id;
  });
  player.addListener("not_ready", () => {
    created.deviceId = null;
  });
  player.addListener("initialization_error", () => {
    created.failure = "unsupported";
  });
  player.addListener("authentication_error", () => {
    created.failure = "permissions";
  });
  player.addListener("account_error", () => {
    created.failure = "premium";
  });

  shared = created;
  return created;
}
