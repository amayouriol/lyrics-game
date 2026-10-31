import { cookies, headers } from "next/headers";
import { isWebMode } from "@/lib/app-mode";
import { authUrl, callbackUrl, googleConfig, newLoginStart } from "@/lib/google-auth";
import { authSecret, LOGIN_COOKIE, LOGIN_COOKIE_AGE, sealLogin } from "@/lib/web-user";

/** The start of "Sign in with Google": remember this try, then go to Google. */
export async function GET(request: Request) {
  if (!isWebMode()) return new Response(null, { status: 404 });
  const config = googleConfig();
  const secret = authSecret();
  // Not set up: back to the start page with a message, never an open door.
  if (!config || !secret) {
    return new Response(null, { status: 303, headers: { Location: "/?signin=unavailable" } });
  }

  const sent = await headers();
  const redirectUri = callbackUrl(request.url, sent.get("x-forwarded-host"), sent.get("x-forwarded-proto"));
  const attempt = await newLoginStart();
  (await cookies()).set(LOGIN_COOKIE, await sealLogin(attempt, secret), {
    httpOnly: true,
    // Lax, so the cookie comes back when Google sends the browser to the callback.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: LOGIN_COOKIE_AGE,
    path: "/api/auth/google",
  });
  return new Response(null, {
    status: 303,
    headers: { Location: authUrl(config.clientId, redirectUri, attempt.state, attempt.challenge) },
  });
}
