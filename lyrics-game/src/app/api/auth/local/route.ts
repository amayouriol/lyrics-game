import { notAvailableInWeb } from "@/lib/app-mode";
import { cookies } from "next/headers";
import { isThisMachine, LOCAL_COOKIE } from "@/lib/session";

/**
 * "Use without Spotify": remembers, in this browser, that you chose to. It
 * only works on this machine's own address; anywhere else it does nothing.
 * Relative Location on purpose, like logout.
 */
export async function GET() {
  const unavailable = notAvailableInWeb();
  if (unavailable) return unavailable;
  if (!(await isThisMachine())) {
    return new Response(null, { status: 303, headers: { Location: "/" } });
  }
  (await cookies()).set(LOCAL_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return new Response(null, { status: 303, headers: { Location: "/" } });
}
