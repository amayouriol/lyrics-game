import { NextResponse } from "next/server";
import { answerList, isListId, parseName } from "@/lib/list-http";
import { deleteOwnList, renameOwnList } from "@/lib/own-library";
import { ownUser } from "@/lib/own-access";

type Context = { params: Promise<{ listId: string }> };

/** Renames a list: `{ name }`. */
export async function PATCH(request: Request, { params }: Context) {
  const { listId } = await params;
  if (!isListId(listId)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const who = await ownUser();
  if ("denied" in who) return who.denied;
  const name = parseName(await request.json().catch(() => null));
  if (name === null) return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  try {
    return answerList(await renameOwnList(who.userId, listId, name));
  } catch (error) {
    console.error("[/api/own/lists/:id]", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

/** Deletes a list. Its songs stay in your library. */
export async function DELETE(_request: Request, { params }: Context) {
  const { listId } = await params;
  if (!isListId(listId)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const who = await ownUser();
  if ("denied" in who) return who.denied;
  try {
    return answerList(await deleteOwnList(who.userId, listId));
  } catch (error) {
    console.error("[/api/own/lists/:id]", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
