import { isTrackId } from "@/lib/track-id";
import { type NextRequest, NextResponse } from "next/server";
import { checkTracks, getCachedInfo, type LyricsLookup } from "@/lib/lyrics";
import { getSession, hasAccess } from "@/lib/session";

const MAX_BATCH = 10;
const MAX_TEXT = 300;
const MAX_DURATION_MS = 3 * 60 * 60 * 1000;

function isText(value: unknown, allowEmpty: boolean): value is string {
  return typeof value === "string" && value.length <= MAX_TEXT && (allowEmpty || value.length > 0);
}

function parseBody(body: unknown): LyricsLookup[] | null {
  if (!body || typeof body !== "object") return null;
  const tracks = (body as { tracks?: unknown }).tracks;
  if (!Array.isArray(tracks) || tracks.length === 0 || tracks.length > MAX_BATCH) return null;

  const parsed: LyricsLookup[] = [];
  for (const t of tracks) {
    if (!t || typeof t !== "object") return null;
    const { id, title, primaryArtist, album, durationMs } = t as Record<string, unknown>;
    if (typeof id !== "string" || !isTrackId(id)) return null;
    if (!isText(title, false) || !isText(primaryArtist, false) || !isText(album, true)) return null;
    if (typeof durationMs !== "number" || !(durationMs > 0) || durationMs > MAX_DURATION_MS) {
      return null;
    }
    parsed.push({ id, title, primaryArtist, album, durationMs });
  }
  return parsed;
}

export async function POST(request: NextRequest) {
  // Only the logged-in user can use this, so it isn't an open proxy to LRCLIB.
  const session = await getSession();
  if (!(await hasAccess(session))) {
    return NextResponse.json({ error: "session_expired" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const tracks = parseBody(body);
  if (!tracks) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const statuses = await checkTracks(tracks);
  // Songs just found to have lyrics: their language, for the filter.
  const available = tracks.map((t) => t.id).filter((id) => statuses[id] === "available");
  const info = await getCachedInfo(available);
  const languages = Object.fromEntries(available.map((id) => [id, info[id].language]));
  return NextResponse.json({ statuses, languages });
}
