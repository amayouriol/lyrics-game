import { NextResponse } from "next/server";
import { getSession, getValidAccessToken } from "@/lib/session";
import { PLAYER_SCOPES, SpotifySessionExpiredError } from "@/lib/spotify";

/**
 * Hands the browser a short-lived access token, which Spotify's in-browser
 * player needs. The refresh token never leaves the server.
 */
export async function GET() {
  try {
    const accessToken = await getValidAccessToken();
    const session = await getSession();
    const granted = session.scope?.split(" ") ?? [];
    return NextResponse.json(
      {
        accessToken,
        missingScopes: PLAYER_SCOPES.filter((s) => !granted.includes(s)),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof SpotifySessionExpiredError) {
      const session = await getSession();
      await session.destroy();
      return NextResponse.json({ error: "session_expired" }, { status: 401 });
    }
    console.error("[/api/player/token]", error);
    return NextResponse.json({ error: "token_unavailable" }, { status: 502 });
  }
}
