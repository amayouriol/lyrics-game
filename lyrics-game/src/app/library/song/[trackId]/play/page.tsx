import { redirect } from "next/navigation";
import { isDifficulty } from "@/lib/game";
import { currentProfile, getSession, hasAccess } from "@/lib/session";
import { getMatch } from "@/lib/video-matches";
import { PlayClient } from "./PlayClient";

// No header on the play screen, per the design.
export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ trackId: string }>;
  searchParams: Promise<{ from?: string; level?: string; mode?: string; source?: string }>;
}) {
  const session = await getSession();
  if (!(await hasAccess(session))) {
    redirect("/");
  }
  const profile = await currentProfile(session);

  const { trackId } = await params;
  const { from, level, mode, source } = await searchParams;

  // YouTube when the song has a chosen video (unless Spotify was picked); else Spotify.
  const match = source === "spotify" ? null : await getMatch(trackId).catch(() => null);

  return (
    <PlayClient
      trackId={trackId}
      from={from ?? null}
      initialLevel={isDifficulty(level) ? level : "medium"}
      initialMode={mode === "sing" ? "sing" : "type"}
      videoId={match?.videoId ?? null}
      profile={profile}
    />
  );
}
