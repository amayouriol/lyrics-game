/** The web version's data: each person's own, the rest shared. Runs on a fake database. */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { memoryDatabase, useDatabaseForTests } from "./database.ts";
import { getGames, saveGame } from "./games.ts";
import { getCacheEntries, saveCacheEntries, type CacheEntry } from "./lyrics-cache.ts";
import { addOwnSong, getAllOwnTracks, getOwnSong, getOwnSources } from "./own-library.ts";
import { getSaved, setSaved } from "./saved.ts";
import { getMatch, setMatch, setMatchesIfMissing } from "./video-matches.ts";
import type { Game } from "./progress.ts";

const before = process.env.APP_MODE;
let database: ReturnType<typeof memoryDatabase>;

beforeEach(() => {
  database = memoryDatabase();
  useDatabaseForTests(database);
  process.env.APP_MODE = "web";
});
afterEach(() => {
  useDatabaseForTests(null);
  if (before === undefined) delete process.env.APP_MODE;
  else process.env.APP_MODE = before;
});

const song = {
  id: "yt-abcdefghijk",
  title: "Song",
  artist: "Artist",
  primaryArtist: "Artist",
  album: "",
  durationMs: 180000,
  duration: "3:00",
  cover: null,
};

describe("the web version keeps each person's data apart", () => {
  it("added songs and lists", async () => {
    await addOwnSong("ana", song);
    assert.equal((await getOwnSong("ana", song.id))?.title, "Song");
    assert.equal(await getOwnSong("ben", song.id), null);
    assert.equal((await getOwnSources("ana")).length, 1);
    assert.deepEqual(await getOwnSources("ben"), []);
    assert.equal((await getAllOwnTracks("ana")).length, 1);
    assert.deepEqual(await getAllOwnTracks("ben"), []);
  });

  it("favorites and Play later", async () => {
    await setSaved("ana", "favorites", song, true);
    assert.equal((await getSaved("ana")).favorites.length, 1);
    assert.equal((await getSaved("ben")).favorites.length, 0);
  });

  it("finished games", async () => {
    const game = { id: "g1", song: { trackId: song.id } } as unknown as Game;
    assert.equal(await saveGame("ana", game), "saved");
    assert.equal(await saveGame("ana", game), "duplicate");
    assert.equal((await getGames("ana")).length, 1);
    assert.equal((await getGames("ben")).length, 0);
  });
});

describe("the web version shares what is the same for everyone", () => {
  it("the chosen video of a song", async () => {
    await setMatch(song.id, { videoId: "abcdefghijk", title: "T", channel: "C" });
    assert.equal((await getMatch(song.id))?.videoId, "abcdefghijk");
  });

  it("an imported playlist keeps a choice that was already made", async () => {
    await setMatch("yt-one", { videoId: "firstfirst1", title: "T", channel: "C" });
    await setMatchesIfMissing({
      "yt-one": { videoId: "otherother1", title: "T", channel: "C" },
      "yt-two": { videoId: "secondsecon", title: "T", channel: "C" },
    });
    assert.equal((await getMatch("yt-one"))?.videoId, "firstfirst1");
    assert.equal((await getMatch("yt-two"))?.videoId, "secondsecon");
  });

  it("found lyrics, one entry per song", async () => {
    const entry: CacheEntry = {
      status: "available",
      title: "Song",
      primaryArtist: "Artist",
      album: "",
      durationMs: 180000,
      checkedAt: 1,
      lines: [{ timeMs: 0, text: "hello" }],
    };
    await saveCacheEntries([["yt-one", entry], ["yt-two", { ...entry, status: "unavailable" }]]);
    const found = await getCacheEntries(["yt-one", "yt-two", "yt-missing"]);
    assert.equal(found.get("yt-one")?.lines?.[0].text, "hello");
    assert.equal(found.get("yt-two")?.status, "unavailable");
    assert.equal(found.has("yt-missing"), false);
    assert.ok(database.data.has("lyrics:yt-one"));
  });

  it("lyrics still work when the database does not answer", async () => {
    useDatabaseForTests({
      get: async () => { throw new Error("down"); },
      set: async () => { throw new Error("down"); },
      getMany: async () => { throw new Error("down"); },
      setMany: async () => { throw new Error("down"); },
    });
    const originalWarn = console.warn;
    const originalError = console.error;
    console.warn = () => {};
    console.error = () => {};
    try {
      assert.equal((await getCacheEntries(["yt-one"])).size, 0);
      await saveCacheEntries([["yt-one", { status: "unavailable" } as CacheEntry]]);
    } finally {
      console.warn = originalWarn;
      console.error = originalError;
    }
  });
});
