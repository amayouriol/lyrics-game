import { NextResponse } from "next/server";
import { getOwnSources } from "@/lib/own-library";
import { getSession, getUserId, hasAccess } from "@/lib/session";

/** The songs and playlists added from YouTube, as cards for the library. */
export async function GET() {
  if (!(await hasAccess(await getSession()))) {
    return NextResponse.json({ error: "session_expired" }, { status: 401 });
  }
  try {
    return NextResponse.json({ sources: await getOwnSources(await getUserId()) });
  } catch (error) {
    console.error("[/api/own/lists]", error);
    return NextResponse.json({ error: "library_unavailable" }, { status: 500 });
  }
}
