/** The lists you make in your library: run on both backends with `npm test`. */
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";

// Files go to a temporary folder, never your own .data. Set before the library loads.
const folder = await fs.mkdtemp(path.join(os.tmpdir(), "lyric-drop-lists-"));
process.env.LYRICS_DATA_DIR = folder;

const { memoryDatabase, useDatabaseForTests } = await import("./database.ts");
const lib = await import("./own-library.ts");
const {
  ADDED_LIST,
  addOwnSong,
  addToOwnList,
  cleanListName,
  createOwnList,
  deleteOwnList,
  getAllOwnTracks,
  getOwnSources,
  getOwnTracks,
  removeFromOwnList,
  renameOwnList,
} = lib;

const song = (n: number) => ({
  id: `yt-song${String(n).padStart(7, "0")}`,
  title: `Song ${n}`,
  artist: "Artist",
  primaryArtist: "Artist",
  album: "",
  durationMs: 180000,
  duration: "3:00",
  cover: null,
});

const originalMode = process.env.APP_MODE;

after(async () => {
  await fs.rm(folder, { recursive: true, force: true });
});

for (const mode of ["files", "database"] as const) {
  describe(`your lists (${mode})`, () => {
    // A new person each time, so checks never see each other's lists.
    let me: string;
    let counter = 0;

    before(() => {
      if (mode === "database") process.env.APP_MODE = "web";
      else delete process.env.APP_MODE;
    });
    beforeEach(async () => {
      useDatabaseForTests(memoryDatabase());
      if (mode === "files") await fs.rm(path.join(folder, "own-library.json"), { force: true });
      me = `person-${++counter}`;
    });
    afterEach(() => useDatabaseForTests(null));
    after(() => {
      if (originalMode === undefined) delete process.env.APP_MODE;
      else process.env.APP_MODE = originalMode;
    });

    it("makes a list and shows it with no songs", async () => {
      const made = await createOwnList(me, "Easy English");
      assert.equal(made.ok, true);
      const sources = await getOwnSources(me);
      assert.equal(sources.length, 1);
      assert.equal(sources[0].name, "Easy English");
      assert.equal(sources[0].count, 0);
      assert.ok(sources[0].id.startsWith("own:my-"));
    });

    it("keeps names tidy and refuses empty, too long and repeated ones", async () => {
      assert.equal(cleanListName("  Easy   English  "), "Easy English");
      assert.equal(cleanListName("   "), null);
      assert.equal(cleanListName("x".repeat(61)), null);
      assert.deepEqual(await createOwnList(me, "  "), { ok: false, reason: "invalid_name" });
      assert.equal((await createOwnList(me, "Road trip")).ok, true);
      assert.deepEqual(await createOwnList(me, "road TRIP"), { ok: false, reason: "name_taken" });
    });

    it("puts songs you already have into a list, newest first, once each", async () => {
      await addOwnSong(me, song(1));
      await addOwnSong(me, song(2));
      await addOwnSong(me, song(3));
      const made = await createOwnList(me, "Mine");
      assert.ok(made.ok);
      const listId = (made as { id: string }).id;
      assert.deepEqual(await addToOwnList(me, listId, [song(1).id, song(2).id]), {
        ok: true,
        added: 2,
        missing: 0,
      });
      assert.deepEqual(await addToOwnList(me, listId, [song(2).id, song(3).id, song(3).id]), {
        ok: true,
        added: 1,
        missing: 0,
      });
      const tracks = await getOwnTracks(me, listId);
      assert.deepEqual(
        tracks?.map((t) => t.id),
        [song(3).id, song(1).id, song(2).id]
      );
    });

    it("leaves out a song that isn't in your library", async () => {
      await addOwnSong(me, song(1));
      const made = (await createOwnList(me, "Mine")) as { id: string };
      assert.deepEqual(await addToOwnList(me, made.id, [song(1).id, "yt-nothere0000"]), {
        ok: true,
        added: 1,
        missing: 1,
      });
    });

    it("lets one song be in two lists", async () => {
      await addOwnSong(me, song(1));
      const a = (await createOwnList(me, "A")) as { id: string };
      const b = (await createOwnList(me, "B")) as { id: string };
      await addToOwnList(me, a.id, [song(1).id]);
      await addToOwnList(me, b.id, [song(1).id]);
      assert.equal((await getOwnTracks(me, a.id))?.length, 1);
      assert.equal((await getOwnTracks(me, b.id))?.length, 1);
      assert.equal((await getAllOwnTracks(me)).length, 1);
    });

    it("takes a song off one list only", async () => {
      await addOwnSong(me, song(1));
      const a = (await createOwnList(me, "A")) as { id: string };
      const b = (await createOwnList(me, "B")) as { id: string };
      await addToOwnList(me, a.id, [song(1).id]);
      await addToOwnList(me, b.id, [song(1).id]);
      assert.deepEqual(await removeFromOwnList(me, a.id, song(1).id), { ok: true });
      assert.equal((await getOwnTracks(me, a.id))?.length, 0);
      assert.equal((await getOwnTracks(me, b.id))?.length, 1);
      assert.equal((await getAllOwnTracks(me)).length, 1);
      assert.deepEqual(await removeFromOwnList(me, "my-nothere", song(1).id), {
        ok: false,
        reason: "not_found",
      });
    });

    it("renames a list, but not to another list's name", async () => {
      const a = (await createOwnList(me, "A")) as { id: string };
      await createOwnList(me, "B");
      assert.deepEqual(await renameOwnList(me, a.id, "B"), { ok: false, reason: "name_taken" });
      assert.deepEqual(await renameOwnList(me, a.id, " "), { ok: false, reason: "invalid_name" });
      assert.deepEqual(await renameOwnList(me, "my-nothere", "C"), { ok: false, reason: "not_found" });
      assert.deepEqual(await renameOwnList(me, a.id, "a"), { ok: true });
      assert.ok((await getOwnSources(me)).some((s) => s.name === "a"));
    });

    it("deletes a list and keeps its songs in the library", async () => {
      await addOwnSong(me, song(1));
      const a = (await createOwnList(me, "A")) as { id: string };
      await addToOwnList(me, a.id, [song(1).id]);
      assert.deepEqual(await deleteOwnList(me, a.id), { ok: true });
      assert.equal(await getOwnTracks(me, a.id), null);
      assert.equal((await getAllOwnTracks(me)).length, 1);
      assert.deepEqual(await deleteOwnList(me, a.id), { ok: false, reason: "not_found" });
    });

    it("never deletes 'Added songs', but it can be renamed and keeps taking songs", async () => {
      await addOwnSong(me, song(1));
      assert.deepEqual(await deleteOwnList(me, ADDED_LIST), { ok: false, reason: "default_list" });
      assert.deepEqual(await renameOwnList(me, ADDED_LIST, "My picks"), { ok: true });
      await addOwnSong(me, song(2));
      const sources = await getOwnSources(me);
      assert.equal(sources.length, 1);
      assert.equal(sources[0].name, "My picks");
      assert.equal(sources[0].count, 2);
    });

    // On your own computer the file is just you; apart is for the web version.
    it("keeps each person's lists apart", { skip: mode === "files" }, async () => {
      await createOwnList(me, "Mine");
      assert.deepEqual(await getOwnSources(`${me}-other`), []);
    });
  });
}
