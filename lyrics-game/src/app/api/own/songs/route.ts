import { NextResponse } from "next/server";
import { describeTracks } from "@/lib/library";
import { getAllOwnTracks } from "@/lib/own-library";
import { ownUser } from "@/lib/own-access";

/** Every song you added from YouTube, newest first. No Spotify involved, so it's cheap to ask. */
export async function GET() {
  const who = await ownUser();
  if ("denied" in who) return who.denied;
  try {
    return NextResponse.json({ tracks: await describeTracks(await getAllOwnTracks(who.userId)) });
  } catch (error) {
    console.error("[/api/own/songs]", error);
    return NextResponse.json({ error: "library_unavailable" }, { status: 500 });
  }
}
