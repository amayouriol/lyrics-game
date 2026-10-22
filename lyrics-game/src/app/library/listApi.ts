/** Talking to the list routes, and what to say when one says no. */
const LIST_ERRORS: Record<string, string> = {
  invalid_name: "Give the list a name of 1 to 60 characters.",
  name_taken: "You already have a list with that name.",
  not_found: "That list isn't there any more. Reload the page.",
  default_list: "“Added songs” can't be deleted, but you can rename it.",
  session_expired: "Your session ended. Log in again.",
};

export type ListCall<T> = { ok: true; data: T } | { ok: false; message: string };

/** Sends a change to the list routes: the answer, or a sentence to show. */
export async function sendList<T = Record<string, never>>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: Record<string, unknown>
): Promise<ListCall<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const answer = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, message: LIST_ERRORS[answer.error] ?? "Something went wrong. Try again." };
    }
    return { ok: true, data: answer as T };
  } catch {
    return { ok: false, message: "Something went wrong. Try again." };
  }
}

/** A source id ("own:my-1a2b3c4d") as the list routes want it ("my-1a2b3c4d"). */
export const listIdOf = (sourceId: string): string => sourceId.replace(/^own:/, "");
