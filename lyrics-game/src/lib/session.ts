import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies, headers } from "next/headers";
import { isWebMode } from "./app-mode";
import { PERSON_COOKIE } from "./gate";
import { knownUser, rememberUser } from "./local-user";
import { getCurrentUser, refreshAccessToken, SpotifySessionExpiredError } from "./spotify";

export interface SessionData {
  accessToken?: string;
  refreshToken?: string;
  /** epoch ms when accessToken stops being valid */
  expiresAt?: number;
  /** Space-separated scopes Spotify actually granted (absent on sessions from before it was stored). */
  scope?: string;
  /** Your Spotify user id (absent on sessions from before Phase 6; see getUserId). */
  userId?: string;
  /** Your Spotify display name and picture, from login (absent on sessions from before Phase 9). */
  name?: string;
  picture?: string;
}

/** What the greeting and top bar show about you. */
export interface Profile {
  name: string | null;
  picture: string | null;
  /** Logged in to Spotify (false when using the app without it). */
  connected: boolean;
  /** The web version: no Spotify and no account menu. */
  web: boolean;
}

/** Your name and picture as kept at login. No Spotify request: until you log in again, both are null. */
export function getProfile(session: SessionData): Profile {
  return { name: session.name ?? null, picture: session.picture ?? null, connected: true, web: false };
}

/** The profile for the top bar: yours from the login, or, without Spotify, the one remembered from the last login. */
export async function currentProfile(session: SessionData): Promise<Profile> {
  if (isWebMode()) return { name: null, picture: null, connected: false, web: true };
  if (hasActiveSession(session)) return getProfile(session);
  const { name, picture } = await knownUser();
  return { name, picture, connected: false, web: false };
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "lyrics_game_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // Keeps you logged in across visits, per the phase 1 spec.
    maxAge: 60 * 60 * 24 * 30,
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  // The web version keeps no session (and has no SESSION_SECRET): an empty one, so nothing Spotify-shaped can be forged.
  if (isWebMode()) {
    return { save: async () => {}, destroy: () => {}, updateConfig: () => {} } as unknown as IronSession<SessionData>;
  }
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export function hasActiveSession(session: SessionData): boolean {
  return Boolean(session.accessToken && session.refreshToken && session.expiresAt);
}

/**
 * Using the app without Spotify is a choice you make on the start page, and
 * only works when the address in the browser is this machine's own
 * (127.0.0.1 or localhost), so it isn't open to others on the same network.
 * (The address comes from the request, so this is a convenience for a home
 * computer, not a lock: a hosted version needs a real login.)
 */
export const LOCAL_COOKIE = "lyrics_game_local";

export async function isThisMachine(): Promise<boolean> {
  const name = ((await headers()).get("host") ?? "").replace(/:\d+$/, "");
  return name === "127.0.0.1" || name === "localhost" || name === "[::1]";
}

/** You chose to use the app without Spotify, on this machine. */
export async function isLocalMode(): Promise<boolean> {
  return (await isThisMachine()) && (await cookies()).get(LOCAL_COOKIE)?.value === "1";
}

/** Logged in to Spotify, or using the app without it. */
export async function hasAccess(session: SessionData): Promise<boolean> {
  // The web version has no login; the shared-word gate (a later step) decides who gets in.
  if (isWebMode()) return true;
  return hasActiveSession(session) || (await isLocalMode());
}

const REFRESH_BUFFER_MS = 60_000;

/**
 * Returns a Spotify access token guaranteed valid for immediate use,
 * refreshing it first if it's expired (or about to be). Destroys the
 * session and throws SpotifySessionExpiredError if refreshing fails,
 * so callers can send the user back to the login screen.
 */
export async function getValidAccessToken(): Promise<string> {
  return validAccessToken(await getSession());
}

/**
 * Your Spotify user id (in the web version, this browser's random id), for keeping your games. Stored at login; sessions
 * from before that get it from Spotify once and keep it. Route handlers
 * only, since it may save the session. Throws SpotifySessionExpiredError
 * like getValidAccessToken.
 */
export async function getUserId(): Promise<string> {
  if (isWebMode()) return personId();
  const session = await getSession();
  if (!hasActiveSession(session) && (await isLocalMode())) return (await knownUser()).id;
  if (session.userId && hasActiveSession(session)) {
    await rememberUser({
      id: session.userId,
      name: session.name ?? null,
      picture: session.picture ?? null,
    });
    return session.userId;
  }
  // Same session object as the token refresh, so saving the id can't
  // overwrite freshly refreshed tokens with old ones.
  const accessToken = await validAccessToken(session);
  // Same request as at login, so keep your name and picture too.
  const me = await getCurrentUser(accessToken);
  session.userId = me.id;
  session.name = me.name ?? undefined;
  session.picture = me.picture ?? undefined;
  await session.save();
  await rememberUser({ id: me.id, name: me.name ?? null, picture: me.picture ?? null });
  return session.userId;
}

/** The web version: a random id kept in this browser's cookie (given at the gate; made here if it was cleared). */
async function personId(): Promise<string> {
  const store = await cookies();
  const kept = store.get(PERSON_COOKIE)?.value;
  if (kept && /^[0-9a-f-]{36}$/.test(kept)) return kept;
  const id = crypto.randomUUID();
  store.set(PERSON_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return id;
}

async function validAccessToken(session: IronSession<SessionData>): Promise<string> {
  if (!hasActiveSession(session)) {
    throw new SpotifySessionExpiredError("No active session");
  }

  if (Date.now() < session.expiresAt! - REFRESH_BUFFER_MS) {
    return session.accessToken!;
  }

  try {
    const tokens = await refreshAccessToken(session.refreshToken!);
    session.accessToken = tokens.access_token;
    session.expiresAt = Date.now() + tokens.expires_in * 1000;
    if (tokens.refresh_token) session.refreshToken = tokens.refresh_token;
    if (tokens.scope) session.scope = tokens.scope;
    await session.save();
    return session.accessToken;
  } catch {
    await session.destroy();
    throw new SpotifySessionExpiredError("Refresh failed");
  }
}
