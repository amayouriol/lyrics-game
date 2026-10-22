import { isOwnId } from "./track-id.ts";
import type { ListFailure, ListResult } from "./own-library.ts";

/** The status a list change is answered with when it didn't work. */
const STATUS: Record<ListFailure, number> = {
  invalid_name: 400,
  name_taken: 409,
  not_found: 404,
  default_list: 409,
};

/** The answer for a list change: what to send when done, or the reason it wasn't. */
export function answerList<Done extends object>(
  result: ListResult<Done>,
  done: (details: Done) => object = () => ({})
): Response {
  if (result.ok) return Response.json(done(result));
  return Response.json({ error: result.reason }, { status: STATUS[result.reason] });
}

/** A list id as kept: the default list, one you made, or an imported playlist. */
const LIST_ID = /^(added|my-[0-9a-f]{8}|pl-[\w-]{1,64})$/;
export const isListId = (value: unknown): value is string =>
  typeof value === "string" && LIST_ID.test(value);

/** Most songs one request may move into a list. */
export const MAX_SONGS_PER_REQUEST = 200;

/** The song ids of a request body, or null if it isn't a short list of YouTube song ids. */
export function parseSongIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_SONGS_PER_REQUEST) return null;
  return value.every((id) => typeof id === "string" && isOwnId(id)) ? (value as string[]) : null;
}

/** The "name" of a request body, or null if it isn't text. */
export function parseName(body: unknown): string | null {
  const name = (body as { name?: unknown } | null)?.name;
  return typeof name === "string" && name.length <= 500 ? name : null;
}
