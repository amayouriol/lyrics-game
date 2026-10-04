import { NextResponse } from "next/server";
import { describeTracks, getSources, getTracks } from "@/lib/library";
import { getSession, getValidAccessToken } from "@/lib/session";
import { SpotifyApiError, SpotifySessionExpiredError, type Track } from "@/lib/spotify";

/** Playlists loaded at the same time; Spotify rate-limits bursts. */
const PARALLEL = 2;

/**
 * Every song in Liked Songs and your playlists, each once (first place
 * found, Liked Songs first), for searching the whole library. A playlist
 * that fails is named in `failed` rather than failing the whole search.
 */
export async function GET() {
  try {
    const accessToken = await getValidAccessToken();
    const sources = await getSources(accessToken);

    const lists: (Track[] | null)[] = new Array(sources.length).fill(null);
    let rateLimited = false;
    for (let i = 0; i < sources.length; i += PARALLEL) {
      await Promise.all(
        sources.slice(i, i + PARALLEL).map(async (source, j) => {
          try {
            lists[i + j] = await getTracks(accessToken, source.id);
          } catch (error) {
            if (error instanceof SpotifySessionExpiredError) throw error;
            if (error instanceof SpotifyApiError && error.rateLimited) rateLimited = true;
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
    return NextResponse.json({
      tracks: await describeTracks(tracks),
      failed: sources.filter((_, i) => lists[i] === null).map((s) => s.name),
      rateLimited,
    });
  } catch (error) {
    console.error("[/api/library/all]", error);
    if (error instanceof SpotifySessionExpiredError) {
      const session = await getSession();
      await session.destroy();
      return NextResponse.json({ error: "session_expired" }, { status: 401 });
    }
    if (error instanceof SpotifyApiError && error.rateLimited) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    return NextResponse.json({ error: "library_unavailable" }, { status: 502 });
  }
}
