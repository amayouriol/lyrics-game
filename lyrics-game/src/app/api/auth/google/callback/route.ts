import { cookies, headers } from "next/headers";
import { isWebMode } from "@/lib/app-mode";
import { adoptPerson } from "@/lib/adopt-person";
import { callbackUrl, exchangeCode, googleConfig, sameState } from "@/lib/google-auth";
import {
  authSecret,
  LOGIN_COOKIE,
  PERSON_COOKIE,
  readLogin,
  sealUser,
  USER_COOKIE,
  USER_COOKIE_AGE,
} from "@/lib/web-user";

const to = (location: string) => new Response(null, { status: 303, headers: { Location: location } });

/** Where Google sends you back: check it is the try we started, learn who you are, keep it in a cookie. */
export async function GET(request: Request) {
  if (!isWebMode()) return new Response(null, { status: 404 });
  const config = googleConfig();
  const secret = authSecret();
  if (!config || !secret) return to("/?signin=unavailable");

  const store = await cookies();
  const attempt = await readLogin(store.get(LOGIN_COOKIE)?.value, secret);
  // One try, one use.
  store.delete({ name: LOGIN_COOKIE, path: "/api/auth/google" });

  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  // Cancelled at Google, or not the try this browser started (someone else's link).
  if (params.get("error") || !code || !attempt || !sameState(attempt.state, params.get("state"))) {
    return to("/?signin=failed");
  }

  try {
    const sent = await headers();
    const redirectUri = callbackUrl(request.url, sent.get("x-forwarded-host"), sent.get("x-forwarded-proto"));
    const user = await exchangeCode(code, attempt.verifier, redirectUri, config);
    store.set(USER_COOKIE, await sealUser({ id: user.id, name: user.name, picture: user.picture }, secret), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: USER_COOKIE_AGE,
      path: "/",
    });
    // A friend from before Google sign-in brings their songs and games along, once.
    const oldId = store.get(PERSON_COOKIE)?.value;
    if (oldId) {
      await adoptPerson(oldId, user.id).catch((error) => console.error("[adoptPerson]", error));
      store.delete(PERSON_COOKIE);
    }
    return to("/home");
  } catch (error) {
    console.error("[/api/auth/google/callback]", error instanceof Error ? error.message : error);
    return to("/?signin=failed");
  }
}
