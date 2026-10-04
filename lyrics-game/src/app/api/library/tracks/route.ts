import { type NextRequest, NextResponse } from "next/server";
import { describeTracks } from "@/lib/library";
import { getSaved } from "@/lib/saved";
import { getSession, getUserId, getValidAccessToken } from "@/lib/session";
import { listTracks, SpotifySessionExpiredError, type Track } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source");
  if (!source) {
    return NextResponse.json({ error: "missing_source" }, { status: 400 });
  }

  try {
    let tracks: Track[];
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
    } else {
      tracks = await listTracks(await getValidAccessToken(), source);
    }
    return NextResponse.json({ tracks: await describeTracks(tracks) });
  } catch (error) {
    console.error("[/api/library/tracks]", error);
    if (error instanceof SpotifySessionExpiredError) {
      const session = await getSession();
      await session.destroy();
      return NextResponse.json({ error: "session_expired" }, { status: 401 });
    }
    return NextResponse.json({ error: "library_unavailable" }, { status: 502 });
  }
}
