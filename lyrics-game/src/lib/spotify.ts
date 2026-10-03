const ACCOUNTS_URL = "https://accounts.spotify.com";
const API_URL = "https://api.spotify.com/v1";

export const SPOTIFY_SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-library-read",
  "streaming",
  "user-read-playback-state",
  "user-modify-playback-state",
].join(" ");

export class SpotifySessionExpiredError extends Error {}

interface TokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

function basicAuthHeader(): string {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET are not set");
  }
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID ?? "",
    scope: SPOTIFY_SCOPES,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI ?? "",
    state,
  });
  return `${ACCOUNTS_URL}/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const res = await fetch(`${ACCOUNTS_URL}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI ?? "",
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Spotify token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(`${ACCOUNTS_URL}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new SpotifySessionExpiredError(`Spotify refresh failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function spotifyGet(path: string, accessToken: string) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    // A 401 here means the access token itself is invalid (e.g. revoked
    // from Spotify's end) even though it hadn't expired by our own clock.
    // Retrying won't fix that, so treat it the same as a failed refresh.
    if (res.status === 401) {
      throw new SpotifySessionExpiredError(`Spotify API error 401 for ${path}`);
    }
    throw new SpotifyApiError(res.status, `Spotify API error ${res.status} for ${path}`);
  }
  return res.json();
}

export class SpotifyApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export interface Source {
  id: string;
  name: string;
  count: number;
}

export interface Track {
  id: string;
  title: string;
  /** All artists, for display. */
  artist: string;
  /** First listed artist; LRCLIB indexes songs by main artist only. */
  primaryArtist: string;
  album: string;
  durationMs: number;
  duration: string;
  cover: string | null;
}

interface SpotifyImage {
  url: string;
  width: number | null;
  height: number | null;
}

interface SpotifyArtist {
  name: string;
}

interface SpotifyTrack {
  id: string | null;
  type?: string;
  is_local?: boolean;
  name: string;
  duration_ms: number;
  artists: SpotifyArtist[];
  album: { name: string; images: SpotifyImage[] };
}

// Spotify renamed playlist "tracks" to "items" for Development Mode apps
// (March 2026). Non-owned playlists omit "items" entirely.
interface SpotifyPlaylist {
  id: string;
  name: string;
  items?: { total: number };
  owner: { id: string };
}

interface SpotifyUser {
  id: string;
}

interface SpotifyPage<T> {
  items: T[];
  next: string | null;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function pickCover(images: SpotifyImage[] | undefined, minWidth: number): string | null {
  if (!images || images.length === 0) return null;
  const sorted = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  return sorted.find((img) => (img.width ?? 0) >= minWidth)?.url ?? sorted[sorted.length - 1].url;
}

function mapTrack(track: SpotifyTrack & { id: string }, coverMinWidth = 64): Track {
  return {
    id: track.id,
    title: track.name,
    artist: track.artists.map((a) => a.name).join(", "),
    primaryArtist: track.artists[0]?.name ?? "",
    album: track.album?.name ?? "",
    durationMs: track.duration_ms,
    duration: formatDuration(track.duration_ms),
    cover: pickCover(track.album?.images, coverMinWidth),
  };
}

/** One track with a large cover, or null if Spotify doesn't know the id. */
export async function getTrack(accessToken: string, id: string): Promise<Track | null> {
  try {
    const track: SpotifyTrack = await spotifyGet(`/tracks/${encodeURIComponent(id)}`, accessToken);
    if (!track.id) return null;
    return mapTrack({ ...track, id: track.id }, 300);
  } catch (error) {
    if (error instanceof SpotifyApiError && (error.status === 404 || error.status === 400)) {
      return null;
    }
    throw error;
  }
}

/**
 * Liked Songs first, then every playlist you own, each with its track count.
 *
 * Playlists you merely follow (Discover Weekly, Release Radar, anyone else's)
 * are excluded: since March 2026 Spotify only returns a playlist's contents
 * to Development Mode apps if the user owns or collaborates on it.
 */
export async function listSources(accessToken: string): Promise<Source[]> {
  const sources: Source[] = [];

  const [liked, me]: [{ total: number }, SpotifyUser] = await Promise.all([
    spotifyGet("/me/tracks?limit=1", accessToken),
    spotifyGet("/me", accessToken),
  ]);
  sources.push({ id: "liked", name: "Liked Songs", count: liked.total });

  let path: string | null = "/me/playlists?limit=50";
  while (path) {
    const page: SpotifyPage<SpotifyPlaylist> = await spotifyGet(path, accessToken);
    for (const playlist of page.items) {
      if (!playlist?.id) continue;
      if (playlist.owner?.id !== me.id) continue;
      sources.push({
        id: playlist.id,
        name: playlist.name ?? "Untitled playlist",
        count: playlist.items?.total ?? 0,
      });
    }
    path = page.next ? page.next.replace(API_URL, "") : null;
  }

  return sources;
}

/** All tracks for a source id ("liked" or a playlist id), paginated to completion. */
export async function listTracks(accessToken: string, sourceId: string): Promise<Track[]> {
  const tracks: Track[] = [];
  const isLiked = sourceId === "liked";
  // Liked Songs entries still use "track"; playlist entries were renamed to
  // "item" along with the endpoint (/tracks -> /items).
  let path: string | null = isLiked
    ? "/me/tracks?limit=50"
    : `/playlists/${encodeURIComponent(sourceId)}/items?limit=50`;

  while (path) {
    const page: SpotifyPage<{ track?: SpotifyTrack | null; item?: SpotifyTrack | null }> =
      await spotifyGet(path, accessToken);
    for (const entry of page.items) {
      const track = isLiked ? entry.track : entry.item;
      // Skip removed tracks, podcast episodes (no artists/album), and local
      // files (no Spotify id, and Spotify's web player can't stream them).
      if (!track?.id || track.is_local || (track.type && track.type !== "track")) continue;
      tracks.push(mapTrack({ ...track, id: track.id }));
    }
    path = page.next ? page.next.replace(API_URL, "") : null;
  }

  return tracks;
}
