import { NextResponse } from "next/server";
import { isListId } from "@/lib/list-http";
import { checkLimit } from "@/lib/limits";
import { addOwnSong, addOwnSongs, addToOwnList, getOwnSources } from "@/lib/own-library";
import { getSession, getUserId, hasAccess } from "@/lib/session";
import type { Track } from "@/lib/spotify";
import { ownIdFor } from "@/lib/track-id";
import { setMatch, setMatchesIfMissing } from "@/lib/video-matches";
import {
  failureStatus,
  formatDuration,
  getPlaylistSongs,
  getVideoSongs,
  parseYouTubeLink,
  YouTubeError,
  type VideoSong,
} from "@/lib/youtube";

const VIDEO_ID = /^[\w-]{11}$/;

function toTrack(song: VideoSong): Track {
  return {
    id: ownIdFor(song.videoId),
    title: song.title,
    artist: song.artist,
    primaryArtist: song.primaryArtist,
    album: "",
    durationMs: song.durationMs,
    duration: formatDuration(song.durationMs),
    cover: song.cover,
  };
}

/**
 * Adds songs from YouTube to the library. The body is one of:
 * - `{ link }`: a pasted address of a video (one song) or a playlist (all its songs);
 * - `{ videoId }`: a video you picked from a search.
 * A single song can also say `listId`, a list of yours to put it in as well. A
 * playlist always becomes its own list, so it ignores `listId`.
 * The song's details come from YouTube here, not from the browser.
 */
export async function POST(request: Request) {
  if (!(await hasAccess(await getSession()))) {
    return NextResponse.json({ error: "session_expired" }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const listId = body.listId;
  if (listId !== undefined && !isListId(listId)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const regionParam = typeof body.region === "string" ? body.region : "";
  const region = /^[A-Z]{2}$/.test(regionParam) ? regionParam : null;

  let videoId: string | undefined;
  let playlistId: string | undefined;
  if (typeof body.videoId === "string" && VIDEO_ID.test(body.videoId)) {
    videoId = body.videoId;
  } else if (typeof body.link === "string" && body.link.length <= 500) {
    const parsed = parseYouTubeLink(body.link);
    if (!parsed) return NextResponse.json({ error: "not_a_youtube_link" }, { status: 400 });
    videoId = parsed.videoId;
    playlistId = parsed.videoId ? undefined : parsed.playlistId;
  } else {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const userId = await getUserId();
    if (playlistId) {
      const limited = await checkLimit("import", userId);
      if (limited) return limited;
      const playlist = await getPlaylistSongs(playlistId, region);
      const tracks = playlist.songs.map(toTrack);
      const { added } = await addOwnSongs(userId, tracks, {
        id: `pl-${playlistId}`,
        name: playlist.name,
        cover: playlist.cover,
      });
      await setMatchesIfMissing(
        Object.fromEntries(
          playlist.songs.map((s) => [
            ownIdFor(s.videoId),
            { videoId: s.videoId, title: s.title, channel: s.artist },
          ])
        )
      );
      return NextResponse.json({
        kind: "playlist",
        name: playlist.name,
        added,
        alreadyThere: tracks.length - added,
        skipped: playlist.skipped,
        tooLong: playlist.tooLong,
      });
    }

    // Check the list first, so a wrong one doesn't cost a YouTube request.
    if (listId && !(await getOwnSources(userId)).some((l) => l.id === `own:${listId}`)) {
      return NextResponse.json({ error: "list_not_found" }, { status: 404 });
    }

    const [song] = await getVideoSongs([videoId!], region);
    if (!song) return NextResponse.json({ error: "video_not_found" }, { status: 404 });
    if (!song.playable) return NextResponse.json({ error: "not_playable" }, { status: 422 });
    const track = toTrack(song);
    const { added } = await addOwnSong(userId, track);
    await setMatch(track.id, { videoId: song.videoId, title: song.title, channel: song.artist });
    const inList = listId ? (await addToOwnList(userId, listId, [track.id])).ok : false;
    return NextResponse.json({ kind: "song", track, added, inList });
  } catch (error) {
    if (error instanceof YouTubeError) {
      return NextResponse.json({ error: error.code }, { status: failureStatus(error.code) });
    }
    console.error("[/api/own/add]", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
