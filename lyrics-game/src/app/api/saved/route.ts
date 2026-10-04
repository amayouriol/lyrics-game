import { NextResponse } from "next/server";
import { getSaved, setSaved, type SavedListName, type SavedSong } from "@/lib/saved";
import { getSession, getUserId } from "@/lib/session";
import { SpotifySessionExpiredError } from "@/lib/spotify";

const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;
const LISTS = new Set<SavedListName>(["favorites", "later"]);

function isText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max;
}

function parseSong(value: unknown): Omit<SavedSong, "addedAt"> | null {
  const t = value as Record<string, unknown> | null;
  if (!t || typeof t !== "object") return null;
  const { id, title, artist, primaryArtist, album, durationMs, duration, cover } = t;
  if (typeof id !== "string" || !SPOTIFY_ID.test(id)) return null;
  if (!isText(title, 500) || !isText(artist, 500) || !isText(primaryArtist, 500)) return null;
  if (!isText(album, 500) || !isText(duration, 20)) return null;
  if (cover !== null && !isText(cover, 2_000)) return null;
  if (typeof durationMs !== "number" || !(durationMs >= 0)) return null;
  return { id, title, artist, primaryArtist, album, durationMs, duration, cover };
}

async function expired() {
  const session = await getSession();
  await session.destroy();
  return NextResponse.json({ error: "session_expired" }, { status: 401 });
}

/** Your Favorites and Play later, newest first. */
export async function GET() {
  try {
    return NextResponse.json(await getSaved(await getUserId()));
  } catch (error) {
    if (error instanceof SpotifySessionExpiredError) return expired();
    console.error("[/api/saved]", error);
    return NextResponse.json({ error: "saved_unavailable" }, { status: 500 });
  }
}

/** Adds a song to Favorites or Play later (`on: true`), or takes it off. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const list = body?.list as SavedListName;
  const song = parseSong(body?.track);
  if (!LISTS.has(list) || !song || typeof body.on !== "boolean") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    return NextResponse.json(await setSaved(await getUserId(), list, song, body.on));
  } catch (error) {
    if (error instanceof SpotifySessionExpiredError) return expired();
    console.error("[/api/saved]", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
