import { isWebMode } from "./app-mode.ts";
import { getDatabase } from "./database.ts";

/**
 * Fair use of YouTube's free allowance in the web version. A search costs
 * 100 of the 10,000 points YouTube gives a day, so each person gets a few,
 * and everyone together a bit under what a day can pay for. Playlists and
 * links cost almost nothing; only playlist imports are counted.
 * Your own copy has no limits.
 */
export type LimitKind = "search" | "import";

export const PER_PERSON: Record<LimitKind, number> = { search: 10, import: 3 };
/** Everyone together; only searches are costly enough to need it. */
export const EVERYONE: Partial<Record<LimitKind, number>> = { search: 80 };

const TWO_DAYS = 2 * 24 * 60 * 60;

/** Today's date, the same for everyone (UTC), so "tomorrow" is the same moment for all. */
export function today(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Counts one use. True when it's allowed, false when the person (or all
 * friends together) used up today's.
 */
export async function spendOne(kind: LimitKind, personId: string, now = new Date()): Promise<boolean> {
  if (!isWebMode()) return true;
  const database = getDatabase();
  const day = today(now);
  const mine = await database.increment(`cap:${kind}:${personId}:${day}`, TWO_DAYS);
  if (mine > PER_PERSON[kind]) return false;
  const all = EVERYONE[kind];
  if (all !== undefined && (await database.increment(`cap:${kind}:everyone:${day}`, TWO_DAYS)) > all) {
    return false;
  }
  return true;
}

/** The answer for a route when a limit is used up, or null to carry on. */
export async function checkLimit(kind: LimitKind, personId: string): Promise<Response | null> {
  if (await spendOne(kind, personId)) return null;
  return Response.json({ error: kind === "search" ? "search_limit" : "import_limit" }, { status: 429 });
}
