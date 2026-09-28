import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { buildAuthorizeUrl } from "@/lib/spotify";

export async function GET() {
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
