import { type NextRequest, NextResponse } from "next/server";
import { getCachedStatuses } from "@/lib/lyrics";
import { getSession, getValidAccessToken } from "@/lib/session";
import { listTracks, SpotifySessionExpiredError } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source");
  if (!source) {
    return NextResponse.json({ error: "missing_source" }, { status: 400 });
  }

  try {
    const accessToken = await getValidAccessToken();
    const tracks = await listTracks(accessToken, source);
    const statuses = await getCachedStatuses(tracks.map((t) => t.id));
    return NextResponse.json({
      tracks: tracks.map((t) => ({ ...t, lyricsStatus: statuses[t.id] })),
    });
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
