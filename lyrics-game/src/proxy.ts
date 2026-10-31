import { NextResponse, type NextRequest } from "next/server";
import { isWebMode } from "@/lib/app-mode";
import { cookieOpensGate, GATE_COOKIE } from "@/lib/gate";
import { authSecret, readUser, USER_COOKIE } from "@/lib/web-user";

/** What anyone may open: the start page (where the Play pop-up asks for the word and the Google sign-in), the notes, and the sign-in itself. */
const OPEN_PATHS = new Set([
  "/",
  "/about",
  "/api/gate",
  "/api/auth/google",
  "/api/auth/google/callback",
  "/api/auth/signout",
]);

/**
 * The web version's two locks. Everything beyond the start page needs the
 * cookie that the shared word gives and the cookie that Google sign-in
 * gives. Your own copy is untouched. If the word or the sign-in key isn't set
 * up, nothing opens (fail closed).
 */
export async function proxy(request: NextRequest) {
  if (!isWebMode()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  const word = process.env.WEB_GATE_WORD ?? "";
  if (!word.trim()) {
    return new NextResponse("The web version isn't set up yet: no shared word.", { status: 503 });
  }

  if (OPEN_PATHS.has(pathname)) return NextResponse.next();
  // The old "Enter the word" page: the pop-up on the start page does that now.
  if (pathname === "/enter") return NextResponse.redirect(new URL("/", request.url));

  const wordOk = await cookieOpensGate(request.cookies.get(GATE_COOKIE)?.value, word);
  const signedIn = Boolean(await readUser(request.cookies.get(USER_COOKIE)?.value, authSecret()));
  if (wordOk && signedIn) return NextResponse.next();

  // The pages the browser asks for itself get the start page; the app's own requests get a plain "no".
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "session_expired" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  // Not the built files and pictures.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
