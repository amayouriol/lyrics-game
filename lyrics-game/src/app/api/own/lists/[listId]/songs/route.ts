import { NextResponse } from "next/server";
import { answerList, isListId, parseSongIds } from "@/lib/list-http";
import { addToOwnList } from "@/lib/own-library";
import { ownUser } from "@/lib/own-access";

/** Puts songs you already have into a list: `{ songIds }`. */
export async function POST(request: Request, { params }: { params: Promise<{ listId: string }> }) {
  const { listId } = await params;
  if (!isListId(listId)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const who = await ownUser();
  if ("denied" in who) return who.denied;
  const songIds = parseSongIds((await request.json().catch(() => null))?.songIds);
  if (!songIds) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  try {
    return answerList(await addToOwnList(who.userId, listId, songIds), ({ added, missing }) => ({
      added,
      missing,
    }));
  } catch (error) {
    console.error("[/api/own/lists/:id/songs]", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
