import { cookies, headers } from "next/headers";
import { isWebMode } from "@/lib/app-mode";
import { getDatabase } from "@/lib/database";
import { GATE_COOKIE, gateToken, PERSON_COOKIE, wordOpensGate } from "@/lib/gate";

/** Wrong words allowed per hour from one address, so the word can't be guessed by trying. */
const WRONG_PER_HOUR = 10;

const back = (query = "") =>
  new Response(null, { status: 303, headers: { Location: `/enter${query}` } });

/**
 * The "Enter the word" form. Right word: a cookie that opens the gate and,
 * the first time, a random id for this browser's games and songs.
 * Relative Location on purpose, like logout.
 */
export async function POST(request: Request) {
  if (!isWebMode()) return new Response(null, { status: 404 });
  const word = process.env.WEB_GATE_WORD ?? "";
  const typed = (await request.formData().catch(() => null))?.get("word");
  if (typeof typed !== "string" || typed.length > 200) return back("?wrong=1");

  const forwarded = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const hour = new Date().toISOString().slice(0, 13);
  const wrong = await getDatabase()
    .increment(`gate-wrong:${forwarded}:${hour}`, 2 * 60 * 60)
    .catch(() => 0);
  if (wrong > WRONG_PER_HOUR) return back("?wait=1");

  if (!(await wordOpensGate(typed, word))) return back("?wrong=1");

  const store = await cookies();
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  };
  store.set(GATE_COOKIE, await gateToken(word), options);
  if (!store.get(PERSON_COOKIE)) store.set(PERSON_COOKIE, crypto.randomUUID(), options);
  return new Response(null, { status: 303, headers: { Location: "/" } });
}
