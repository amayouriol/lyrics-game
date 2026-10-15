/** Rule checks for song ids: run with `npm test`. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isOwnId, isSpotifyId, isTrackId, ownIdFor } from "./track-id.ts";

test("Spotify ids are 22 letters and digits", () => {
  assert.ok(isSpotifyId("4cOdK2wGLETKBW3PvgPWqT"));
  assert.ok(!isSpotifyId("4cOdK2wGLETKBW3PvgPWq"));
  assert.ok(!isSpotifyId("4cOdK2wGLETKBW3PvgPW-T"));
});

test("a song from YouTube has yt- and its video id", () => {
  assert.equal(ownIdFor("dQw4w9WgXcQ"), "yt-dQw4w9WgXcQ");
  assert.ok(isOwnId("yt-dQw4w9WgXcQ"));
  assert.ok(isOwnId("yt-a_b-c1d2e3f"));
  assert.ok(!isOwnId("yt-short"));
  assert.ok(!isOwnId("dQw4w9WgXcQ"));
  assert.ok(!isOwnId("yt-dQw4w9WgXcQ/../x"));
});

test("a track id is either kind, and nothing else", () => {
  assert.ok(isTrackId("4cOdK2wGLETKBW3PvgPWqT"));
  assert.ok(isTrackId("yt-dQw4w9WgXcQ"));
  assert.ok(!isTrackId(""));
  assert.ok(!isTrackId("../../etc/passwd"));
});
