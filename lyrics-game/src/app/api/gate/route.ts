import { cookies, headers } from "next/headers";
import { isWebMode } from "@/lib/app-mode";
import { getDatabase } from "@/lib/database";
import { GATE_COOKIE, gateToken, wordOpensGate } from "@/lib/gate";

/** Wrong words allowed per hour from one address, so the word can't be guessed by trying. */
const WRONG_PER_HOUR = 10;

/**
 * The shared word, asked in the Play pop-up. Right word: a cookie that opens
 * the gate. Answers JSON: `{ ok: true }`, or `{ error: "wrong" | "wait" }`.
 */
export async function POST(request: Request) {
  if (!isWebMode()) return new Response(null, { status: 404 });
  const word = process.env.WEB_GATE_WORD ?? "";
  const typed = (await request.formData().catch(() => null))?.get("word");
  if (typeof typed !== "string" || typed.length > 200) {
    return Response.json({ error: "wrong" }, { status: 400 });
  }

  const forwarded = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const hour = new Date().toISOString().slice(0, 13);
  const wrong = await getDatabase()
    .increment(`gate-wrong:${forwarded}:${hour}`, 2 * 60 * 60)
    .catch(() => 0);
  if (wrong > WRONG_PER_HOUR) return Response.json({ error: "wait" }, { status: 429 });

  if (!(await wordOpensGate(typed, word))) return Response.json({ error: "wrong" }, { status: 401 });

  (await cookies()).set(GATE_COOKIE, await gateToken(word), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return Response.json({ ok: true });
}
