import { NextResponse } from "next/server";
import { answerList, isListId } from "@/lib/list-http";
import { removeFromOwnList } from "@/lib/own-library";
import { ownUser } from "@/lib/own-access";
import { isOwnId } from "@/lib/track-id";

/** Takes a song off one list. It stays in your library and your other lists. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ listId: string; songId: string }> }
) {
  const { listId, songId } = await params;
  if (!isListId(listId) || !isOwnId(songId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const who = await ownUser();
  if ("denied" in who) return who.denied;
  try {
    return answerList(await removeFromOwnList(who.userId, listId, songId));
  } catch (error) {
    console.error("[/api/own/lists/:id/songs/:id]", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
