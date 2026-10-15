import { NextResponse } from "next/server";
import { searchVideos, YouTubeError } from "@/lib/youtube";

const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

/**
 * The best three videos for a song. Each search uses part of YouTube's free
 * daily quota, so the screen only asks when you open "Choose a video".
 */
export async function GET(request: Request, { params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params;
  if (!SPOTIFY_ID.test(trackId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const query = new URL(request.url).searchParams;
  const title = query.get("title") ?? "";
  const artist = query.get("artist") ?? "";
  const durationMs = Number(query.get("durationMs"));
  const regionParam = query.get("region");
  const region = regionParam && /^[A-Z]{2}$/.test(regionParam) ? regionParam : null;
  if (!title || title.length > 500 || !artist || artist.length > 500 || !(durationMs > 0)) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  try {
    const videos = await searchVideos({ title, primaryArtist: artist, durationMs }, region);
    return NextResponse.json({ videos });
  } catch (error) {
    if (error instanceof YouTubeError) {
      return NextResponse.json({ error: error.code }, { status: error.code === "no_key" ? 500 : 502 });
    }
    console.error("[/api/video/search]", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
