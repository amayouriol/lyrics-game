import { NextResponse, type NextRequest } from "next/server";
import { isWebMode } from "@/lib/app-mode";
import { cookieOpensGate, GATE_COOKIE } from "@/lib/gate";

/**
 * The web version's gate: without the cookie that the shared word gives,
 * only the "Enter the word" page (and what it needs) answers. Your own copy
 * is untouched. If the word isn't set up, nothing opens (fail closed).
 */
export async function proxy(request: NextRequest) {
  if (!isWebMode()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  const word = process.env.WEB_GATE_WORD ?? "";
  if (!word.trim()) {
    return new NextResponse("The web version isn't set up yet: no shared word.", { status: 503 });
  }

  const open = await cookieOpensGate(request.cookies.get(GATE_COOKIE)?.value, word);
  if (pathname === "/api/gate") return NextResponse.next();
  if (pathname === "/enter") {
    // Already in: nothing to enter.
    return open ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  if (open) return NextResponse.next();

  // The pages the browser asks for itself get the entry page; the app's own requests get a plain "no".
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "session_expired" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/enter", request.url));
}

export const config = {
  // Not the built files and pictures.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
