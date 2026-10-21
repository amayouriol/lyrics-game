import { isWebMode } from "./app-mode.ts";
import { getDatabase } from "./database.ts";
import { freshJsonFile, jsonFile } from "./json-file.ts";

/**
 * Data kept under a key (a person, a song). On your computer it's one file
 * in .data/ holding everything by key; in the web version each key is its
 * own entry in the database. The code above doesn't know which.
 *
 * - `fresh`: read from the file every time (see freshJsonFile).
 * - `singleFile`: in the file, the data is the whole file, not one entry per
 *   key. For data that is one person's (your own copy has just you).
 *
 * A change runs on what was read and takes effect only once written. In the
 * database, two changes to the same key at the very same moment from two
 * servers could overwrite each other; for one person's own data that is
 * rare, and the worst case is one lost tap.
 */
export interface KeyedStore<T> {
  read(key: string): Promise<T>;
  update<R>(key: string, change: (current: T) => { next: T; result: R }): Promise<R>;
  /** Several keys in one go: `change` returns only the entries that changed. */
  updateMany<R>(
    keys: string[],
    change: (current: Record<string, T>) => { changed: Record<string, T>; result: R }
  ): Promise<R>;
}

export function keyedStore<T>(
  name: string,
  empty: () => T,
  options: { fresh?: boolean; singleFile?: boolean } = {}
): KeyedStore<T> {
  const makeFile = options.fresh ? freshJsonFile : jsonFile;
  const single = options.singleFile
    ? makeFile<T & object>(`${name}.json`, empty as () => T & object)
    : null;
  const record = options.singleFile ? null : makeFile<Record<string, T>>(`${name}.json`, () => ({}));
  const queues = new Map<string, Promise<unknown>>();

  /** Changes to the same key one after the other, as the file store does. */
  function inLine<R>(key: string, run: () => Promise<R>): Promise<R> {
    const job = (queues.get(key) ?? Promise.resolve()).then(run);
    const tail = job.catch(() => {});
    queues.set(key, tail);
    void tail.then(() => {
      if (queues.get(key) === tail) queues.delete(key);
    });
    return job;
  }

  const entry = (key: string) => `${name}:${key}`;

  async function readFromDatabase(key: string): Promise<T> {
    const raw = await getDatabase().get(entry(key));
    return raw === null ? empty() : (JSON.parse(raw) as T);
  }

  return {
    async read(key) {
      if (isWebMode()) return readFromDatabase(key);
      if (single) return single.read();
      return (await record!.read())[key] ?? empty();
    },

    update<R>(key: string, change: (current: T) => { next: T; result: R }): Promise<R> {
      if (isWebMode()) {
        return inLine(entry(key), async () => {
          const current = await readFromDatabase(key);
          const { next, result } = change(current);
          if (next !== current) await getDatabase().set(entry(key), JSON.stringify(next));
          return result;
        });
      }
      if (single) {
        return single.update<R>(change as (c: T & object) => { next: T & object; result: R });
      }
      return record!.update((all) => {
        const current = all[key] ?? empty();
        const { next, result } = change(current);
        return next === current ? { next: all, result } : { next: { ...all, [key]: next }, result };
      });
    },

    async updateMany(keys, change) {
      if (isWebMode()) {
        const database = getDatabase();
        const raws = await database.getMany(keys.map(entry));
        const current: Record<string, T> = {};
        keys.forEach((key, i) => {
          current[key] = raws[i] === null ? empty() : (JSON.parse(raws[i]!) as T);
        });
        const { changed, result } = change(current);
        await database.setMany(Object.entries(changed).map(([key, value]) => [entry(key), JSON.stringify(value)]));
        return result;
      }
      if (single) throw new Error("updateMany needs one entry per key");
      return record!.update((all) => {
        const current: Record<string, T> = {};
        for (const key of keys) current[key] = all[key] ?? empty();
        const { changed, result } = change(current);
        return Object.keys(changed).length === 0
          ? { next: all, result }
          : { next: { ...all, ...changed }, result };
      });
    },
  };
}
