import { NextResponse } from "next/server";
import { getSession, hasActiveSession } from "@/lib/session";
import { failureStatus, searchVideos, YouTubeError } from "@/lib/youtube";

/**
 * The best three videos for a title and artist typed by hand, for adding a
 * song that isn't in the library yet. Each search uses part of YouTube's
 * free daily quota, so it only runs when you press search.
 */
export async function GET(request: Request) {
  if (!hasActiveSession(await getSession())) {
    return NextResponse.json({ error: "session_expired" }, { status: 401 });
  }
  const query = new URL(request.url).searchParams;
  const title = (query.get("title") ?? "").trim();
  const artist = (query.get("artist") ?? "").trim();
  const regionParam = query.get("region");
  const region = regionParam && /^[A-Z]{2}$/.test(regionParam) ? regionParam : null;
  if (!title || title.length > 300 || artist.length > 300) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  try {
    // The song's length isn't known yet, so videos aren't compared to it.
    return NextResponse.json({
      videos: await searchVideos({ title, primaryArtist: artist, durationMs: 0 }, region),
    });
  } catch (error) {
    if (error instanceof YouTubeError) {
      return NextResponse.json({ error: error.code }, { status: failureStatus(error.code) });
    }
    console.error("[/api/own/search]", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
