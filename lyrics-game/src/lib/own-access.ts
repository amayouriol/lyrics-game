import { getSession, getUserId, hasAccess } from "./session";
import { SpotifySessionExpiredError } from "./spotify";

/**
 * Who is asking, for the routes of your own library: you (or a web friend),
 * or the answer to send if there is no access. Routes only, since the web
 * version's id may be saved in a cookie.
 */
export async function ownUser(): Promise<{ userId: string } | { denied: Response }> {
  if (!(await hasAccess(await getSession()))) {
    return { denied: Response.json({ error: "session_expired" }, { status: 401 }) };
  }
  try {
    return { userId: await getUserId() };
  } catch (error) {
    if (!(error instanceof SpotifySessionExpiredError)) throw error;
    await (await getSession()).destroy();
    return { denied: Response.json({ error: "session_expired" }, { status: 401 }) };
  }
}
