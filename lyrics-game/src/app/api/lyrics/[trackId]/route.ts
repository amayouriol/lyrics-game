import { NextResponse } from "next/server";
import { getDictionary, getLanguage } from "@/lib/dictionary";
import { DIFFICULTY_ORDER, pickBlanks } from "@/lib/game";
import { getLyrics } from "@/lib/lyrics";
import { singableWords } from "@/lib/sing";
import { getSession, getValidAccessToken } from "@/lib/session";
import { getTrack, SpotifySessionExpiredError } from "@/lib/spotify";

const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

/**
 * Song data for the song and play screens, including the timed lyrics. The
 * screens only ever show the current and previous lines; sending the text
 * to the browser was accepted in the Phase 4 spec ("hidden on screen only").
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
      primaryArtist: track.primaryArtist,
      album: track.album,
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

    // Picked here because it needs the dictionaries, which stay on the server.
    const isWord = await getDictionary();
    const blanks = Object.fromEntries(
      DIFFICULTY_ORDER.map((level) => [level, pickBlanks(lyrics.lines, level, isWord)])
    );

    // Sing mode: which words of each line are sung for points (not "oh", not names).
    const singable = lyrics.lines.map((line) => singableWords(line.text, isWord));

    // Sing mode listens for this language.
    const language = lyrics.lines.length ? await getLanguage(trackId, lyrics.lines) : null;

    return NextResponse.json({
      track: summary,
      status: lyrics.status,
      language,
      lineCount: lyrics.lines.length,
      lines: lyrics.lines,
      blanks,
      singable,
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
