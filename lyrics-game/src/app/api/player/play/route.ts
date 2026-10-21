import { notAvailableInWeb } from "@/lib/app-mode";
import { type NextRequest, NextResponse } from "next/server";
import { getSession, getValidAccessToken } from "@/lib/session";
import { SpotifyApiError, SpotifySessionExpiredError, startPlayback } from "@/lib/spotify";

const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;
const DEVICE_ID = /^[A-Za-z0-9]{1,100}$/;
const MAX_POSITION_MS = 3 * 60 * 60 * 1000;

/** Starts a song on this browser's player: `{ deviceId, trackId, positionMs? }`. */
export async function POST(request: NextRequest) {
  const unavailable = notAvailableInWeb();
  if (unavailable) return unavailable;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { deviceId, trackId, positionMs = 0 } = body ?? {};
  if (
    typeof deviceId !== "string" ||
    !DEVICE_ID.test(deviceId) ||
    typeof trackId !== "string" ||
    !SPOTIFY_ID.test(trackId) ||
    typeof positionMs !== "number" ||
    !(positionMs >= 0 && positionMs <= MAX_POSITION_MS)
  ) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const accessToken = await getValidAccessToken();
    await startPlayback(accessToken, deviceId, trackId, Math.round(positionMs));
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("[/api/player/play]", error);
    if (error instanceof SpotifySessionExpiredError) {
      const session = await getSession();
      await session.destroy();
      return NextResponse.json({ error: "session_expired" }, { status: 401 });
    }
    // Spotify's error body carries reason "PREMIUM_REQUIRED" for non-Premium accounts.
    if (
      error instanceof SpotifyApiError &&
      error.status === 403 &&
      error.message.includes("PREMIUM_REQUIRED")
    ) {
      return NextResponse.json({ error: "premium_required" }, { status: 403 });
    }
    return NextResponse.json({ error: "play_failed" }, { status: 502 });
  }
}
