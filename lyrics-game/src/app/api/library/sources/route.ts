import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/session";
import { listSources, SpotifySessionExpiredError } from "@/lib/spotify";

export async function GET() {
  try {
    const accessToken = await getValidAccessToken();
    const sources = await listSources(accessToken);
    return NextResponse.json({ sources });
  } catch (error) {
    console.error("[/api/library/sources]", error);
    if (error instanceof SpotifySessionExpiredError) {
      return NextResponse.json({ error: "session_expired" }, { status: 401 });
    }
    return NextResponse.json({ error: "library_unavailable" }, { status: 502 });
  }
}
