import { notAvailableInWeb } from "@/lib/app-mode";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { exchangeCodeForTokens, getCurrentUser } from "@/lib/spotify";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const unavailable = notAvailableInWeb();
  if (unavailable) return unavailable;
  const { searchParams } = request.nextUrl;
  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const storedState = cookieStore.get("spotify_auth_state")?.value;
  cookieStore.delete("spotify_auth_state");

  // Cancelled/denied on Spotify's consent screen, or a tampered/missing state
  // (CSRF check) — either way there's nothing to recover, send them to the
  // dedicated "login is required" screen per the spec's error handling.
  if (error || !code || !state || !storedState || state !== storedState) {
    redirect("/denied");
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const session = await getSession();
    session.accessToken = tokens.access_token;
    session.refreshToken = tokens.refresh_token;
    session.expiresAt = Date.now() + tokens.expires_in * 1000;
    session.scope = tokens.scope;
    try {
      // The one profile request: your id for your games, and your name and
      // picture for the greeting and top bar.
      const me = await getCurrentUser(tokens.access_token);
      session.userId = me.id;
      session.name = me.name ?? undefined;
      session.picture = me.picture ?? undefined;
    } catch {
      // Not worth failing the login over: getUserId fetches it when needed.
    }
    await session.save();
  } catch {
    redirect("/denied");
  }

  redirect("/");
}
