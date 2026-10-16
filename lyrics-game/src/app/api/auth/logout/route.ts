import { cookies } from "next/headers";
import { getSession, LOCAL_COOKIE } from "@/lib/session";

export async function POST() {
  const session = await getSession();
  await session.destroy();
  // Also leaves "use the app without Spotify", so Log out always ends on the start page.
  (await cookies()).delete(LOCAL_COOKIE);
  // Relative Location on purpose: in dev, request.url reports "localhost"
  // even when the browser is on 127.0.0.1, and switching hosts breaks the
  // next login's state cookie. 303 makes the browser follow up with a GET.
  return new Response(null, { status: 303, headers: { Location: "/" } });
}
