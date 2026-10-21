/**
 * The shared word that keeps the web version to your friends. Whoever enters
 * it gets a cookie holding a fingerprint of the word (not the word), so
 * changing the word in Vercel's settings locks everyone out again.
 */
export const GATE_COOKIE = "lyric_drop_gate";
export const PERSON_COOKIE = "lyric_drop_person";

/** "  Banana " and "banana" are the same word. */
export function cleanWord(word: string): string {
  return word.trim().toLowerCase();
}

/** The fingerprint kept in the cookie. Web Crypto, which the proxy and the routes both have. */
export async function gateToken(word: string): Promise<string> {
  const bytes = new TextEncoder().encode(`lyric-drop-gate:${cleanWord(word)}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Same length strings compared without stopping at the first difference. */
function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

/** Whether a cookie value is the fingerprint of the shared word. */
export async function cookieOpensGate(cookie: string | undefined, word: string): Promise<boolean> {
  if (!cookie || !cleanWord(word)) return false;
  return sameText(cookie, await gateToken(word));
}

/** Whether what someone typed is the shared word. */
export async function wordOpensGate(typed: string, word: string): Promise<boolean> {
  if (!cleanWord(word)) return false;
  return sameText(await gateToken(typed), await gateToken(word));
}
