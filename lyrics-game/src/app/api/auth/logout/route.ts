import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  await session.destroy();
  // 303 forces the browser to follow up with a GET, so a redirect after a
  // POST never re-submits the logout to "/".
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
