import { notAvailableInWeb } from "@/lib/app-mode";
import { type NextRequest, NextResponse } from "next/server";
import { getSources, markListsOutdated } from "@/lib/library";
import { getSession, getValidAccessToken, hasActiveSession, isLocalMode } from "@/lib/session";
import { SpotifyApiError, SpotifySessionExpiredError } from "@/lib/spotify";

/**
 * Liked Songs, then the playlists you own, in Spotify's order, from the
 * saved copy when it's recent. `?refresh=1` reloads them from Spotify now
 * and marks every list's songs to reload when next opened or searched.
 */
export async function GET(request: NextRequest) {
  const unavailable = notAvailableInWeb();
  if (unavailable) return unavailable;
  try {
    // Without Spotify, only the saved copy of your lists can be shown.
    if (!hasActiveSession(await getSession()) && (await isLocalMode())) {
      try {
        const got = await getSources(null);
        return NextResponse.json({
          sources: got.data,
          updatedAt: got.updatedAt,
          blockedUntil: null,
          offline: true,
        });
      } catch (error) {
        if (!(error instanceof SpotifySessionExpiredError)) throw error;
        return NextResponse.json({ sources: [], updatedAt: 0, blockedUntil: null, offline: true });
      }
    }
    const accessToken = await getValidAccessToken();
    const refresh = request.nextUrl.searchParams.get("refresh") === "1";
    const got = await getSources(accessToken, refresh);
    if (refresh && !got.blockedUntil) await markListsOutdated();
    return NextResponse.json({
      sources: got.data,
      updatedAt: got.updatedAt,
      blockedUntil: got.blockedUntil ?? null,
    });
  } catch (error) {
    console.error("[/api/library/sources]", error);
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
