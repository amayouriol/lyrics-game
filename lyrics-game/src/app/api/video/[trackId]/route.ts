import { NextResponse } from "next/server";
import { getMatch, setMatch } from "@/lib/video-matches";

const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;
const VIDEO_ID = /^[\w-]{11}$/;

/** The video chosen for this song, or null. */
export async function GET(_request: Request, { params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params;
  if (!SPOTIFY_ID.test(trackId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  try {
    return NextResponse.json({ match: await getMatch(trackId) });
  } catch (error) {
    console.error("[/api/video]", error);
    return NextResponse.json({ error: "matches_unavailable" }, { status: 500 });
  }
}

/** Saves your choice of video for this song, replacing the old one. */
export async function POST(request: Request, { params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params;
  if (!SPOTIFY_ID.test(trackId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { videoId, title, channel } = body ?? {};
  if (
    typeof videoId !== "string" ||
    !VIDEO_ID.test(videoId) ||
    typeof title !== "string" ||
    title.length > 500 ||
    typeof channel !== "string" ||
    channel.length > 500
  ) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  try {
    return NextResponse.json({ match: await setMatch(trackId, { videoId, title, channel }) });
  } catch (error) {
    console.error("[/api/video]", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
