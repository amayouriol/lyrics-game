import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { after, afterEach, beforeEach, describe, it } from "node:test";
import { memoryDatabase, useDatabaseForTests } from "./database.ts";
import { keyedStore } from "./storage.ts";

const DATA_DIR = path.join(process.cwd(), ".data");
const NAME = "storage-check";
const FILE = path.join(DATA_DIR, `${NAME}.json`);

const SINGLE_NAME = "storage-check-single";
const SINGLE_FILE = path.join(DATA_DIR, `${SINGLE_NAME}.json`);

const before = process.env.APP_MODE;

async function clean() {
  await fs.rm(FILE, { force: true });
  await fs.rm(SINGLE_FILE, { force: true });
}

/** Both backends must answer the same way, so every check runs on each. */
for (const mode of ["files", "database"] as const) {
  describe(`keyed store (${mode})`, () => {
    let database: ReturnType<typeof memoryDatabase>;

    beforeEach(async () => {
      await clean();
      database = memoryDatabase();
      useDatabaseForTests(database);
      if (mode === "database") process.env.APP_MODE = "web";
      else delete process.env.APP_MODE;
    });
    afterEach(() => {
      useDatabaseForTests(null);
      if (before === undefined) delete process.env.APP_MODE;
      else process.env.APP_MODE = before;
    });
    after(clean);

    it("reads the empty value for a key that was never written", async () => {
      const store = keyedStore<string[]>(NAME, () => []);
      assert.deepEqual(await store.read("ana"), []);
    });

    it("keeps each key's data apart", async () => {
      const store = keyedStore<string[]>(NAME, () => []);
      await store.update("ana", (list) => ({ next: [...list, "a"], result: null }));
      await store.update("ben", (list) => ({ next: [...list, "b"], result: null }));
      assert.deepEqual(await store.read("ana"), ["a"]);
      assert.deepEqual(await store.read("ben"), ["b"]);
    });

    it("returns the result of a change", async () => {
      const store = keyedStore<string[]>(NAME, () => []);
      const result = await store.update("ana", (list) => ({ next: [...list, "a"], result: list.length }));
      assert.equal(result, 0);
    });

    it("changes made at the same moment all count", async () => {
      const store = keyedStore<number>(NAME, () => 0);
      await Promise.all(
        Array.from({ length: 10 }, () => store.update("ana", (n) => ({ next: n + 1, result: null })))
      );
      assert.equal(await store.read("ana"), 10);
    });

    it("writes nothing when a change leaves the data as it was", async () => {
      const store = keyedStore<string[]>(NAME, () => []);
      await store.update("ana", (list) => ({ next: list, result: null }));
      if (mode === "database") assert.equal(database.data.size, 0);
      else await assert.rejects(fs.access(FILE));
    });

    it("updates several keys in one go", async () => {
      const store = keyedStore<string | null>(NAME, () => null);
      await store.update("one", () => ({ next: "first", result: null }));
      const added = await store.updateMany(["one", "two"], (current) => ({
        changed: Object.fromEntries(
          Object.entries(current).filter(([, v]) => v === null).map(([k]) => [k, "new"])
        ),
        result: Object.values(current).filter((v) => v === null).length,
      }));
      assert.equal(added, 1);
      assert.equal(await store.read("one"), "first");
      assert.equal(await store.read("two"), "new");
    });

    it("a failed change leaves the data as it was", async () => {
      const store = keyedStore<string[]>(NAME, () => []);
      await store.update("ana", () => ({ next: ["kept"], result: null }));
      await assert.rejects(
        store.update("ana", () => {
          throw new Error("nope");
        })
      );
      assert.deepEqual(await store.read("ana"), ["kept"]);
      await store.update("ana", (list) => ({ next: [...list, "more"], result: null }));
      assert.deepEqual(await store.read("ana"), ["kept", "more"]);
    });
  });
}

describe("keyed store, your own copy's files", () => {
  beforeEach(clean);
  after(clean);

  it("keeps the same file shape as before: one entry per key", async () => {
    delete process.env.APP_MODE;
    const store = keyedStore<string[]>(NAME, () => []);
    await store.update("ana", () => ({ next: ["a"], result: null }));
    assert.deepEqual(JSON.parse(await fs.readFile(FILE, "utf8")), { ana: ["a"] });
  });

  it("with singleFile, the file is the data itself whatever the key", async () => {
    delete process.env.APP_MODE;
    const store = keyedStore<{ songs: string[] }>(SINGLE_NAME, () => ({ songs: [] }), {
      singleFile: true,
    });
    await store.update("anyone", (data) => ({ next: { songs: [...data.songs, "x"] }, result: null }));
    assert.deepEqual(JSON.parse(await fs.readFile(SINGLE_FILE, "utf8")), { songs: ["x"] });
    assert.deepEqual(await store.read("someone else"), { songs: ["x"] });
  });

  it("with singleFile, the database keeps each person's data apart", async () => {
    process.env.APP_MODE = "web";
    useDatabaseForTests(memoryDatabase());
    const store = keyedStore<{ songs: string[] }>(SINGLE_NAME, () => ({ songs: [] }), {
      singleFile: true,
    });
    await store.update("ana", (data) => ({ next: { songs: [...data.songs, "x"] }, result: null }));
    assert.deepEqual(await store.read("ana"), { songs: ["x"] });
    assert.deepEqual(await store.read("ben"), { songs: [] });
    useDatabaseForTests(null);
    delete process.env.APP_MODE;
  });
});
