import { isWebMode } from "@/lib/app-mode";
import { NextResponse } from "next/server";
import { describeTracks, getSources, getTracks } from "@/lib/library";
import { getAllOwnTracks } from "@/lib/own-library";
import {
  getSession,
  getUserId,
  getValidAccessToken,
  hasActiveSession,
  isLocalMode,
} from "@/lib/session";
import { SpotifyApiError, SpotifySessionExpiredError, type Track } from "@/lib/spotify";

/** Playlists loaded at the same time; Spotify rate-limits bursts. */
const PARALLEL = 2;

/**
 * Every song in Liked Songs and your playlists, each once (first place
 * found, Liked Songs first), for searching the whole library. A playlist
 * that fails is named in `failed` rather than failing the whole search.
 */
export async function GET() {
  // The web version has only the songs added from YouTube, and no Spotify to ask.
  if (isWebMode()) {
    const tracks = await describeTracks(await getAllOwnTracks(await getUserId()));
    return NextResponse.json({ tracks, failed: [], rateLimited: false, blockedUntil: null });
  }
  try {
    // Without Spotify, search the saved copy of your lists (and the songs added from YouTube).
    const offline = !hasActiveSession(await getSession()) && (await isLocalMode());
    const accessToken = offline ? null : await getValidAccessToken();
    let got;
    try {
      got = await getSources(accessToken);
    } catch (error) {
      if (!offline || !(error instanceof SpotifySessionExpiredError)) throw error;
      got = { data: [], updatedAt: 0 } as Awaited<ReturnType<typeof getSources>>;
    }
    const sources = got.data;
    let blockedUntil = got.blockedUntil ?? null;

    const lists: (Track[] | null)[] = new Array(sources.length).fill(null);
    let rateLimited = false;
    for (let i = 0; i < sources.length; i += PARALLEL) {
      await Promise.all(
        sources.slice(i, i + PARALLEL).map(async (source, j) => {
          try {
            const list = await getTracks(accessToken, source.id);
            lists[i + j] = list.data;
            if (list.blockedUntil) blockedUntil = list.blockedUntil;
          } catch (error) {
            // Offline, a list that was never saved is just left out.
            if (error instanceof SpotifySessionExpiredError && !offline) throw error;
            if (error instanceof SpotifyApiError && error.rateLimited) {
              rateLimited = true;
              blockedUntil = error.retryAt ?? blockedUntil;
            }
            console.warn(`[/api/library/all] couldn't load "${source.name}"`, error);
          }
        })
      );
    }

    const seen = new Set<string>();
    const tracks: Track[] = [];
    for (const list of lists) {
      for (const track of list ?? []) {
        if (seen.has(track.id)) continue;
        seen.add(track.id);
        tracks.push(track);
      }
    }
    // Songs added from YouTube come after the Spotify ones.
    for (const track of await getAllOwnTracks(await getUserId())) {
      if (seen.has(track.id)) continue;
      seen.add(track.id);
      tracks.push(track);
    }
    return NextResponse.json({
      tracks: await describeTracks(tracks),
      failed: sources.filter((_, i) => lists[i] === null).map((s) => s.name),
      rateLimited,
      blockedUntil,
    });
  } catch (error) {
    console.error("[/api/library/all]", error);
    if (error instanceof SpotifySessionExpiredError) {
      const session = await getSession();
      await session.destroy();
      return NextResponse.json({ error: "session_expired" }, { status: 401 });
    }
    if (error instanceof SpotifyApiError && error.rateLimited) {
      return NextResponse.json(
        { error: "rate_limited", retryAt: error.retryAt ?? null },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "library_unavailable" }, { status: 502 });
  }
}
