/** What the list routes answer, and what they accept: run with `npm test`. */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { memoryDatabase, useDatabaseForTests } from "./database.ts";
import { answerList, isListId, MAX_SONGS_PER_REQUEST, parseName, parseSongIds } from "./list-http.ts";
import { PER_PERSON, remaining, spendOne } from "./limits.ts";

describe("answers for a list change", () => {
  it("sends the details when it worked", async () => {
    const response = answerList({ ok: true, added: 2, missing: 1 }, ({ added, missing }) => ({ added, missing }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { added: 2, missing: 1 });
  });

  it("sends an empty answer when there is nothing to tell", async () => {
    assert.deepEqual(await answerList({ ok: true }).json(), {});
  });

  it("says why when it didn't, with the right status", async () => {
    const cases = [
      ["invalid_name", 400],
      ["name_taken", 409],
      ["not_found", 404],
      ["default_list", 409],
    ] as const;
    for (const [reason, status] of cases) {
      const response = answerList({ ok: false, reason });
      assert.equal(response.status, status);
      assert.deepEqual(await response.json(), { error: reason });
    }
  });
});

describe("what the list routes accept", () => {
  it("list ids: the default one, yours, and imported playlists only", () => {
    assert.equal(isListId("added"), true);
    assert.equal(isListId("my-0a1b2c3d"), true);
    assert.equal(isListId("pl-PLabc_123-xyz"), true);
    for (const bad of ["", "my-", "my-XYZ", "my-0a1b2c3d/extra", "../added", "pl-", 5, null, undefined]) {
      assert.equal(isListId(bad), false, String(bad));
    }
  });

  it("song ids: a short list of YouTube song ids", () => {
    assert.deepEqual(parseSongIds(["yt-abcdefghijk"]), ["yt-abcdefghijk"]);
    assert.equal(parseSongIds([]), null);
    assert.equal(parseSongIds("yt-abcdefghijk"), null);
    assert.equal(parseSongIds(["4uLU6hMCjMI75M1A2tKUQC"]), null); // a Spotify id
    assert.equal(parseSongIds(["yt-abcdefghijk", 3]), null);
    assert.equal(parseSongIds(Array(MAX_SONGS_PER_REQUEST + 1).fill("yt-abcdefghijk")), null);
    assert.notEqual(parseSongIds(Array(MAX_SONGS_PER_REQUEST).fill("yt-abcdefghijk")), null);
  });

  it("names: text, not too long to even look at", () => {
    assert.equal(parseName({ name: "Road trip" }), "Road trip");
    assert.equal(parseName({ name: 5 }), null);
    assert.equal(parseName({}), null);
    assert.equal(parseName(null), null);
    assert.equal(parseName({ name: "x".repeat(501) }), null);
  });
});

describe("how many searches are left today", () => {
  const before = process.env.APP_MODE;
  const day = new Date("2026-10-22T12:00:00Z");
  beforeEach(() => {
    useDatabaseForTests(memoryDatabase());
    process.env.APP_MODE = "web";
  });
  afterEach(() => {
    useDatabaseForTests(null);
    if (before === undefined) delete process.env.APP_MODE;
    else process.env.APP_MODE = before;
  });

  it("starts at the person's share and goes down with each use", async () => {
    assert.equal(await remaining("search", "ana", day), PER_PERSON.search);
    await spendOne("search", "ana", day);
    await spendOne("search", "ana", day);
    assert.equal(await remaining("search", "ana", day), PER_PERSON.search - 2);
    assert.equal(await remaining("search", "ben", day), PER_PERSON.search - 0);
  });

  it("asking never uses one up", async () => {
    for (let i = 0; i < 5; i++) await remaining("search", "ana", day);
    assert.equal(await remaining("search", "ana", day), PER_PERSON.search);
  });

  it("stops at zero, not below", async () => {
    for (let i = 0; i < PER_PERSON.import + 4; i++) await spendOne("import", "ana", day);
    assert.equal(await remaining("import", "ana", day), 0);
  });

  it("is smaller when everyone together is running out", async () => {
    // 75 other friends use one each, so only 5 are left for everyone.
    for (let i = 0; i < 75; i++) await spendOne("search", `friend-${i}`, day);
    assert.equal(await remaining("search", "newcomer", day), 5);
  });

  it("is null in your own copy, which has no limits", async () => {
    delete process.env.APP_MODE;
    assert.equal(await remaining("search", "me", day), null);
  });
});
