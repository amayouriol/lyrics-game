import { NextResponse, type NextRequest } from "next/server";
import { isWebMode } from "@/lib/app-mode";
import { authSecret, readUser, USER_COOKIE } from "@/lib/web-user";

/** What anyone may open: the start page (where the Play pop-up offers the Google sign-in), the notes, and the sign-in itself. */
const OPEN_PATHS = new Set([
  "/",
  "/about",
  "/api/auth/google",
  "/api/auth/google/callback",
  "/api/auth/signout",
]);

/**
 * The web version's lock: everything beyond the start page needs the cookie
 * that Google sign-in gives. Your own copy is untouched. If the sign-in key
 * (AUTH_SECRET) isn't set up, nobody gets in (fail closed).
 */
export async function proxy(request: NextRequest) {
  if (!isWebMode()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (OPEN_PATHS.has(pathname)) return NextResponse.next();
  // The old "Enter the word" page is gone: the start page does the sign-in.
  if (pathname === "/enter") return NextResponse.redirect(new URL("/", request.url));

  const signedIn = Boolean(await readUser(request.cookies.get(USER_COOKIE)?.value, authSecret()));
  if (signedIn) return NextResponse.next();

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
