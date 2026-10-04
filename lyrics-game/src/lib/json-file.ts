import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");

/**
 * A JSON file in .data/ holding your own data (games, saved songs). Unlike
 * the lyrics cache, it's never treated as empty when it can't be read
 * (writing over it would wipe it), and a failed write is reported.
 */
export function jsonFile<T extends object>(name: string, empty: () => T) {
  const file = path.join(DATA_DIR, name);
  let data: T | null = null;
  let loading: Promise<T> | null = null;
  let queue: Promise<unknown> = Promise.resolve();

  async function read(): Promise<T> {
    if (data) return data;
    loading ??= (async () => {
      try {
        data = JSON.parse(await fs.readFile(file, "utf8")) as T;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          loading = null; // let the next request try again
          throw error;
        }
        data = empty();
      }
      return data;
    })();
    return loading;
  }

  /**
   * Applies a change and writes it. Changes run one at a time, each on the
   * result of the last, and only take effect once written: a failed write
   * leaves everything as it was. Written to a temporary file first, so a
   * crash mid-write can't corrupt it.
   */
  function update<R>(change: (current: T) => { next: T; result: R }): Promise<R> {
    const run = queue.then(async () => {
      const { next, result } = change(await read());
      if (next !== data) {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.writeFile(`${file}.tmp`, JSON.stringify(next), "utf8");
        await fs.rename(`${file}.tmp`, file);
        data = next;
      }
      return result;
    });
    queue = run.catch(() => {});
    return run;
  }

  return { read, update };
}
