/** Carrying a friend's old random-id data over to their Google account: run with `npm test`. */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { adoptPerson } from "./adopt-person.ts";
import { memoryDatabase, useDatabaseForTests } from "./database.ts";

const OLD = "0b9f7c3e-1a2b-4c5d-8e6f-123456789abc";
const NEW = "g-110248495921238986420";
const OTHER = "g-999";

let database: ReturnType<typeof memoryDatabase>;

beforeEach(() => {
  database = memoryDatabase();
  useDatabaseForTests(database);
});
afterEach(() => useDatabaseForTests(null));

describe("adopting old data", () => {
  it("copies songs, saved songs and games to the Google id", async () => {
    database.data.set(`own-library:${OLD}`, '{"songs":{},"lists":[]}');
    database.data.set(`saved:${OLD}`, '{"favorites":[]}');
    database.data.set(`games:${OLD}`, "[]");
    assert.equal(await adoptPerson(OLD, NEW), "moved");
    assert.equal(database.data.get(`own-library:${NEW}`), '{"songs":{},"lists":[]}');
    assert.equal(database.data.get(`saved:${NEW}`), '{"favorites":[]}');
    assert.equal(database.data.get(`games:${NEW}`), "[]");
  });

  it("leaves the old entries where they were", async () => {
    database.data.set(`saved:${OLD}`, "x");
    await adoptPerson(OLD, NEW);
    assert.equal(database.data.get(`saved:${OLD}`), "x");
  });

  it("never overwrites an account that already has data", async () => {
    database.data.set(`saved:${OLD}`, "old");
    database.data.set(`games:${NEW}`, "mine");
    assert.equal(await adoptPerson(OLD, NEW), "skipped");
    assert.equal(database.data.get(`games:${NEW}`), "mine");
    assert.equal(database.data.has(`saved:${NEW}`), false);
  });

  it("is taken once: a second person on the same browser can't claim the old data", async () => {
    database.data.set(`saved:${OLD}`, "old");
    assert.equal(await adoptPerson(OLD, NEW), "moved");
    assert.equal(await adoptPerson(OLD, OTHER), "skipped");
    assert.equal(database.data.has(`saved:${OTHER}`), false);
  });

  it("does nothing when there was nothing to bring", async () => {
    assert.equal(await adoptPerson(OLD, NEW), "skipped");
    assert.equal(database.data.has(`own-library:${NEW}`), false);
  });

  it("refuses ids of the wrong shape", async () => {
    database.data.set(`saved:${OLD}`, "old");
    assert.equal(await adoptPerson("../other", NEW), "skipped");
    assert.equal(await adoptPerson(OLD, "someone"), "skipped");
    assert.equal(await adoptPerson(NEW, OTHER), "skipped");
  });
});
