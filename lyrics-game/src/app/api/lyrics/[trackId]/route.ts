import { NextResponse } from "next/server";
import { getLyrics } from "@/lib/lyrics";
import { getSession, getValidAccessToken } from "@/lib/session";
import { getTrack, SpotifySessionExpiredError } from "@/lib/spotify";

const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

/**
 * Summary for the song and play screens. Returns line start times only,
 * never the lyrics text: the app must not show a song's lyrics all at once.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params;
  if (!SPOTIFY_ID.test(trackId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const accessToken = await getValidAccessToken();
    const track = await getTrack(accessToken, trackId);
    if (!track) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const summary = {
      title: track.title,
      artist: track.artist,
      cover: track.cover,
      duration: track.duration,
      durationMs: track.durationMs,
    };

    const lyrics = await getLyrics(track);
    if (lyrics.status === "unknown") {
      return NextResponse.json(
        { error: "lyrics_service_unavailable", track: summary },
        { status: 503 }
      );
    }

    return NextResponse.json({
      track: summary,
      status: lyrics.status,
      lineCount: lyrics.lines.length,
      lineTimesMs: lyrics.lines.map((line) => line.timeMs),
    });
  } catch (error) {
    console.error("[/api/lyrics/[trackId]]", error);
    if (error instanceof SpotifySessionExpiredError) {
      const session = await getSession();
      await session.destroy();
      return NextResponse.json({ error: "session_expired" }, { status: 401 });
    }
    return NextResponse.json({ error: "library_unavailable" }, { status: 502 });
  }
}
