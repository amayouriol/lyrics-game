import { type NextRequest, NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/session";
import { listTracks, SpotifySessionExpiredError } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source");
  if (!source) {
    return NextResponse.json({ error: "missing_source" }, { status: 400 });
  }

  try {
    const accessToken = await getValidAccessToken();
    const tracks = await listTracks(accessToken, source);
    return NextResponse.json({ tracks });
  } catch (error) {
    if (error instanceof SpotifySessionExpiredError) {
      return NextResponse.json({ error: "session_expired" }, { status: 401 });
    }
    return NextResponse.json({ error: "library_unavailable" }, { status: 502 });
  }
}
