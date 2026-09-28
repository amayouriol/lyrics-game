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
    throw new Error(`Spotify API error ${res.status} for ${path}`);
  }
  return res.json();
}

export interface Source {
  id: string;
  name: string;
  count: number;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
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
  id: string;
  name: string;
  duration_ms: number;
  artists: SpotifyArtist[];
  album: { images: SpotifyImage[] };
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  tracks: { total: number };
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

function pickCover(images: SpotifyImage[] | undefined): string | null {
  if (!images || images.length === 0) return null;
  const sorted = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  return sorted.find((img) => (img.width ?? 0) >= 64)?.url ?? sorted[sorted.length - 1].url;
}

function mapTrack(track: SpotifyTrack): Track {
  return {
    id: track.id,
    title: track.name,
    artist: track.artists.map((a) => a.name).join(", "),
    duration: formatDuration(track.duration_ms),
    cover: pickCover(track.album?.images),
  };
}

/**
 * Liked Songs first, then every playlist you own, each with its track count.
 *
 * Playlists you merely follow (Discover Weekly, Release Radar, Daily Mix, or
 * anyone else's playlist) are deliberately excluded: Spotify's API returns a
 * 403 when asked for the actual track list of a playlist you don't own, even
 * with the right scopes granted. There's no way to fix that from this side,
 * so rather than list a playlist that then fails the moment you open it,
 * Phase 1 only shows playlists you created.
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
      // Some playlists (e.g. ones you no longer have access to) come back
      // with fields missing instead of a full object; skip those rather
      // than crash the whole library load over one bad entry.
      if (!playlist || !playlist.id) continue;
      if (playlist.owner?.id !== me.id) continue;
      sources.push({
        id: playlist.id,
        name: playlist.name ?? "Untitled playlist",
        count: playlist.tracks?.total ?? 0,
      });
    }
    path = page.next ? page.next.replace(API_URL, "") : null;
  }

  return sources;
}

/** All tracks for a source id ("liked" or a playlist id), paginated to completion. */
export async function listTracks(accessToken: string, sourceId: string): Promise<Track[]> {
  const tracks: Track[] = [];
  let path: string | null =
    sourceId === "liked" ? "/me/tracks?limit=50" : `/playlists/${sourceId}/tracks?limit=50`;

  while (path) {
    const page: SpotifyPage<{ track: SpotifyTrack | null }> = await spotifyGet(path, accessToken);
    for (const item of page.items) {
      if (!item.track) continue; // local files / removed tracks have no track object
      tracks.push(mapTrack(item.track));
    }
    path = page.next ? page.next.replace(API_URL, "") : null;
  }

  return tracks;
}
