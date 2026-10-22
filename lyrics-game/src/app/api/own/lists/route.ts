import { NextResponse } from "next/server";
import { answerList, parseName } from "@/lib/list-http";
import { createOwnList, getOwnSources } from "@/lib/own-library";
import { ownUser } from "@/lib/own-access";

/** The songs and lists in your own library, as cards for the library. */
export async function GET() {
  const who = await ownUser();
  if ("denied" in who) return who.denied;
  try {
    return NextResponse.json({ sources: await getOwnSources(who.userId) });
  } catch (error) {
    console.error("[/api/own/lists]", error);
    return NextResponse.json({ error: "library_unavailable" }, { status: 500 });
  }
}

/** Makes a list of your own: `{ name }`. Answers with its source id. */
export async function POST(request: Request) {
  const who = await ownUser();
  if ("denied" in who) return who.denied;
  const name = parseName(await request.json().catch(() => null));
  if (name === null) return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  try {
    return answerList(await createOwnList(who.userId, name), ({ id }) => ({ id: `own:${id}` }));
  } catch (error) {
    console.error("[/api/own/lists]", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
