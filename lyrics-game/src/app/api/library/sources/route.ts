import { NextResponse } from "next/server";
import { getSources } from "@/lib/library";
import { getSession, getValidAccessToken } from "@/lib/session";
import { SpotifyApiError, SpotifySessionExpiredError } from "@/lib/spotify";

/** Liked Songs, then the playlists you own, in Spotify's order. */
export async function GET() {
  try {
    const accessToken = await getValidAccessToken();
    const sources = await getSources(accessToken);
    return NextResponse.json({ sources });
  } catch (error) {
    console.error("[/api/library/sources]", error);
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
