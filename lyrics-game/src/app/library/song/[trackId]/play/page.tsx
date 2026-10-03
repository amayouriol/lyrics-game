import { redirect } from "next/navigation";
import { isDifficulty } from "@/lib/game";
import { getSession, hasActiveSession } from "@/lib/session";
import { PlayClient } from "./PlayClient";

// No header on the play screen, per the design.
export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ trackId: string }>;
  searchParams: Promise<{ from?: string; level?: string }>;
}) {
  const session = await getSession();
  if (!hasActiveSession(session)) {
    redirect("/");
  }

  const { trackId } = await params;
  const { from, level } = await searchParams;

  return (
    <PlayClient
      trackId={trackId}
      from={from ?? null}
      initialLevel={isDifficulty(level) ? level : "medium"}
    />
  );
}
