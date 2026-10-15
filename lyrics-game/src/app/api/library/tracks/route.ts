import { type NextRequest, NextResponse } from "next/server";
import { describeTracks, getTracks } from "@/lib/library";
import { getOwnTracks, SOURCE_PREFIX } from "@/lib/own-library";
import { getSaved } from "@/lib/saved";
import {
  getSession,
  getUserId,
  getValidAccessToken,
  hasActiveSession,
  isLocalMode,
} from "@/lib/session";
import { SpotifyApiError, SpotifySessionExpiredError, type Track } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source");
  if (!source) {
    return NextResponse.json({ error: "missing_source" }, { status: 400 });
  }

  try {
    let tracks: Track[];
    let updatedAt: number | null = null;
    let blockedUntil: number | null = null;
    if (source === "favorites" || source === "later") {
      // Kept by the app, not on Spotify; newest first.
      const saved = await getSaved(await getUserId());
      tracks = saved[source].map(
        ({ id, title, artist, primaryArtist, album, durationMs, duration, cover }) => ({
          id,
          title,
          artist,
          primaryArtist,
          album,
          durationMs,
          duration,
          cover,
        })
      );
    } else if (source.startsWith(SOURCE_PREFIX)) {
      // Added from YouTube: kept by the app, no Spotify needed.
      const own = await getOwnTracks(source.slice(SOURCE_PREFIX.length));
      if (!own) return NextResponse.json({ error: "not_found" }, { status: 404 });
      tracks = own;
    } else {
      // Without Spotify, only the saved copy of the list can be shown.
      const offline = !hasActiveSession(await getSession()) && (await isLocalMode());
      const got = await getTracks(offline ? null : await getValidAccessToken(), source);
      tracks = got.data;
      updatedAt = got.updatedAt;
      blockedUntil = got.blockedUntil ?? null;
    }
    return NextResponse.json({ tracks: await describeTracks(tracks), updatedAt, blockedUntil });
  } catch (error) {
    console.error("[/api/library/tracks]", error);
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
