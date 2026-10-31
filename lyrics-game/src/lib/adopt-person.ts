import { getDatabase } from "./database.ts";

/** What is kept for one person in the web version (see keyedStore: each is the entry `<name>:<id>`). */
const PERSONAL = ["games", "own-library", "saved"];

const RANDOM_ID = /^[0-9a-f-]{36}$/;
const GOOGLE_ID = /^g-[0-9A-Za-z_-]{1,255}$/;

/**
 * Before Google sign-in, friends were a random id in a cookie. The first time
 * someone signs in on a browser that still has that cookie, their songs, lists,
 * saved songs and games are copied to their Google id.
 *
 * Copied once per old id: once copied it is marked as taken, so the next person who signs
 * in on the same browser can never claim someone else's old data. An account
 * that already has data of its own is left alone. The old entries stay, unread.
 */
export async function adoptPerson(oldId: string, newId: string): Promise<"moved" | "skipped"> {
  if (!RANDOM_ID.test(oldId) || !GOOGLE_ID.test(newId)) return "skipped";
  const database = getDatabase();

  if ((await database.get(`adopted:${oldId}`)) !== null) return "skipped";
  const [old, current] = await Promise.all([
    database.getMany(PERSONAL.map((name) => `${name}:${oldId}`)),
    database.getMany(PERSONAL.map((name) => `${name}:${newId}`)),
  ]);
  if (current.some((value) => value !== null)) return "skipped";

  const copies: [string, string][] = [];
  PERSONAL.forEach((name, i) => {
    const value = old[i];
    if (value !== null) copies.push([`${name}:${newId}`, value]);
  });
  if (copies.length === 0) return "skipped";
  await database.setMany(copies);
  // Marked only after the copy worked, so a failure in between can be tried again at the next sign-in.
  await database.set(`adopted:${oldId}`, newId);
  return "moved";
}
