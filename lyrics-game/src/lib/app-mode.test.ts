import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { isWebMode, notAvailableInWeb } from "./app-mode.ts";

const API = path.join(process.cwd(), "src", "app", "api");

/** Routes that exist only for Spotify: each must answer "not available" in web mode. */
const SPOTIFY_ROUTES = [
  "auth/login",
  "auth/callback",
  "auth/local",
  "library/sources",
  "library/tracks",
  "player/play",
  "player/token",
  "lyrics/[trackId]",
];

describe("web mode", () => {
  const before = process.env.APP_MODE;
  afterEach(() => {
    if (before === undefined) delete process.env.APP_MODE;
    else process.env.APP_MODE = before;
  });

  it("is off unless APP_MODE is exactly web", () => {
    delete process.env.APP_MODE;
    assert.equal(isWebMode(), false);
    process.env.APP_MODE = "Web ";
    assert.equal(isWebMode(), false);
    process.env.APP_MODE = "web";
    assert.equal(isWebMode(), true);
  });

  it("lets Spotify routes through in your own copy", () => {
    delete process.env.APP_MODE;
    assert.equal(notAvailableInWeb(), null);
  });

  it("answers 'not available' with a 404 in web mode", async () => {
    process.env.APP_MODE = "web";
    const response = notAvailableInWeb();
    assert.equal(response?.status, 404);
    assert.deepEqual(await response?.json(), { error: "not_available" });
  });

  it("is checked by every Spotify route", async () => {
    for (const route of SPOTIFY_ROUTES) {
      const source = await fs.readFile(path.join(API, route, "route.ts"), "utf8");
      assert.match(source, /notAvailableInWeb\(\)/, `${route} must check web mode`);
    }
  });
});
