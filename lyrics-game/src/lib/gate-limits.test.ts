/** The shared-word gate and the daily limits of the web version: run with `npm test`. */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { memoryDatabase, useDatabaseForTests } from "./database.ts";
import { cookieOpensGate, gateToken, wordOpensGate } from "./gate.ts";
import { checkLimit, EVERYONE, PER_PERSON, today, spendOne } from "./limits.ts";

describe("the gate", () => {
  it("opens for the right word, whatever its case or spaces", async () => {
    assert.equal(await wordOpensGate("banana", "banana"), true);
    assert.equal(await wordOpensGate("  Banana ", "banana"), true);
  });

  it("stays shut for a wrong word", async () => {
    assert.equal(await wordOpensGate("bananas", "banana"), false);
    assert.equal(await wordOpensGate("", "banana"), false);
  });

  it("stays shut when no word is set up, even for an empty try", async () => {
    assert.equal(await wordOpensGate("", ""), false);
    assert.equal(await wordOpensGate("  ", "  "), false);
    assert.equal(await cookieOpensGate(await gateToken(""), ""), false);
  });

  it("the cookie holds a fingerprint, not the word", async () => {
    const token = await gateToken("banana");
    assert.ok(!token.includes("banana"));
    assert.equal(await cookieOpensGate(token, "banana"), true);
  });

  it("changing the word locks out the old cookies", async () => {
    const token = await gateToken("banana");
    assert.equal(await cookieOpensGate(token, "mango"), false);
  });

  it("no cookie, or a made-up one, doesn't open it", async () => {
    assert.equal(await cookieOpensGate(undefined, "banana"), false);
    assert.equal(await cookieOpensGate("banana", "banana"), false);
    assert.equal(await cookieOpensGate("", "banana"), false);
  });
});

describe("daily limits", () => {
  const before = process.env.APP_MODE;
  beforeEach(() => {
    useDatabaseForTests(memoryDatabase());
    process.env.APP_MODE = "web";
  });
  afterEach(() => {
    useDatabaseForTests(null);
    if (before === undefined) delete process.env.APP_MODE;
    else process.env.APP_MODE = before;
  });

  const day = new Date("2026-10-20T12:00:00Z");
  const nextDay = new Date("2026-10-21T00:00:01Z");

  it("lets a person search up to their share, then says no", async () => {
    for (let i = 0; i < PER_PERSON.search; i++) assert.equal(await spendOne("search", "ana", day), true);
    assert.equal(await spendOne("search", "ana", day), false);
  });

  it("counts each person on their own", async () => {
    for (let i = 0; i < PER_PERSON.search; i++) await spendOne("search", "ana", day);
    assert.equal(await spendOne("search", "ben", day), true);
  });

  it("counts searches and imports apart", async () => {
    for (let i = 0; i < PER_PERSON.import; i++) assert.equal(await spendOne("import", "ana", day), true);
    assert.equal(await spendOne("import", "ana", day), false);
    assert.equal(await spendOne("search", "ana", day), true);
  });

  it("starts again the next day", async () => {
    for (let i = 0; i < PER_PERSON.search + 1; i++) await spendOne("search", "ana", day);
    assert.equal(await spendOne("search", "ana", nextDay), true);
  });

  it("stops everyone together at the shared total", async () => {
    const total = EVERYONE.search!;
    let allowed = 0;
    for (let i = 0; i < total + 5; i++) {
      // A new friend each time, so nobody reaches their own limit.
      if (await spendOne("search", `friend-${i}`, day)) allowed++;
    }
    assert.equal(allowed, total);
  });

  it("has no limits in your own copy", async () => {
    delete process.env.APP_MODE;
    for (let i = 0; i < PER_PERSON.search + 5; i++) assert.equal(await spendOne("search", "me", day), true);
  });

  it("answers a route with a 429 and a clear code", async () => {
    for (let i = 0; i < PER_PERSON.search; i++) await checkLimit("search", "ana");
    const response = await checkLimit("search", "ana");
    assert.equal(response?.status, 429);
    assert.deepEqual(await response?.json(), { error: "search_limit" });
    assert.equal(await checkLimit("search", "ben"), null);
  });

  it("uses the same date for everyone", () => {
    assert.equal(today(day), "2026-10-20");
    assert.equal(today(nextDay), "2026-10-21");
  });
});
