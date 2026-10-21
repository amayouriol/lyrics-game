import { notAvailableInWeb } from "@/lib/app-mode";
import { randomBytes } from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { buildAuthorizeUrl } from "@/lib/spotify";

export async function GET() {
  const unavailable = notAvailableInWeb();
  if (unavailable) return unavailable;
  // Spotify always returns to the registered redirect URI's host. The state
  // cookie must be set on that same host or the callback can't find it
  // (localhost and 127.0.0.1 are separate sites to the browser), so start
  // the login there.
  const callback = new URL(process.env.SPOTIFY_REDIRECT_URI ?? "");
  const host = (await headers()).get("host");
  if (host && host !== callback.host) {
    redirect(`${callback.origin}/api/auth/login`);
  }

  const state = randomBytes(16).toString("hex");

  const cookieStore = await cookies();
  cookieStore.set("spotify_auth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });

  redirect(buildAuthorizeUrl(state));
}
