import { NextResponse } from "next/server";
import { getSaved } from "@/lib/saved";
import { getSession, getUserId, getValidAccessToken } from "@/lib/session";
import { listSources, SpotifySessionExpiredError, type Source } from "@/lib/spotify";

/** Liked Songs, Favorites, Play later, then the playlists you own. */
export async function GET() {
  try {
    const accessToken = await getValidAccessToken();
    const [spotifySources, saved] = await Promise.all([
      listSources(accessToken),
      getUserId().then(getSaved),
    ]);
    const [liked, ...playlists] = spotifySources;
    const sources: Source[] = [
      liked,
      { id: "favorites", name: "Favorites", count: saved.favorites.length, kind: "favorites", cover: null },
      { id: "later", name: "Play later", count: saved.later.length, kind: "later", cover: null },
      ...playlists,
    ];
    return NextResponse.json({ sources });
  } catch (error) {
    console.error("[/api/library/sources]", error);
    if (error instanceof SpotifySessionExpiredError) {
      const session = await getSession();
      await session.destroy();
      return NextResponse.json({ error: "session_expired" }, { status: 401 });
    }
    return NextResponse.json({ error: "library_unavailable" }, { status: 502 });
  }
}
