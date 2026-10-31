import { cookies } from "next/headers";
import { isWebMode } from "@/lib/app-mode";
import { USER_COOKIE } from "@/lib/web-user";

/** Web version: leaves your account on this browser. The shared-word cookie stays, so signing back in is one click. */
export async function POST() {
  if (!isWebMode()) return new Response(null, { status: 404 });
  (await cookies()).delete(USER_COOKIE);
  // Relative Location on purpose, like logout.
  return new Response(null, { status: 303, headers: { Location: "/" } });
}
