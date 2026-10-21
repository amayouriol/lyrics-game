/**
 * The online database the web version keeps its data in: Upstash Redis,
 * called with plain web requests (no package). Values are text; callers
 * store JSON.
 */
export interface Database {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  /** Values in the order of `keys`, null where there is none. */
  getMany(keys: string[]): Promise<(string | null)[]>;
  setMany(entries: [string, string][]): Promise<void>;
  /** Adds one to a counter (starting at 0) and returns the new count. A new counter disappears after `ttlSeconds`. */
  increment(key: string, ttlSeconds: number): Promise<number>;
}

async function command(args: string[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not set");
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  const body = (await response.json().catch(() => null)) as { result?: unknown; error?: string } | null;
  if (!response.ok || body?.error) {
    throw new Error(`Database request failed (${response.status}): ${body?.error ?? "no answer"}`);
  }
  return body?.result;
}

const upstash: Database = {
  async get(key) {
    return ((await command(["GET", key])) as string | null) ?? null;
  },
  async set(key, value) {
    await command(["SET", key, value]);
  },
  async getMany(keys) {
    if (keys.length === 0) return [];
    return (await command(["MGET", ...keys])) as (string | null)[];
  },
  async setMany(entries) {
    if (entries.length === 0) return;
    await command(["MSET", ...entries.flat()]);
  },
  async increment(key, ttlSeconds) {
    const count = (await command(["INCR", key])) as number;
    if (count === 1) await command(["EXPIRE", key, String(ttlSeconds)]);
    return count;
  },
};

/** A database that lives in memory: for the checks, so they need no account. */
export function memoryDatabase(): Database & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    async get(key) {
      return data.get(key) ?? null;
    },
    async set(key, value) {
      data.set(key, value);
    },
    async getMany(keys) {
      return keys.map((key) => data.get(key) ?? null);
    },
    async setMany(entries) {
      for (const [key, value] of entries) data.set(key, value);
    },
    async increment(key) {
      const count = Number(data.get(key) ?? 0) + 1;
      data.set(key, String(count));
      return count;
    },
  };
}

let override: Database | null = null;

/** For the checks only: use this database instead of Upstash (null puts Upstash back). */
export function useDatabaseForTests(database: Database | null) {
  override = database;
}

export function getDatabase(): Database {
  return override ?? upstash;
}
