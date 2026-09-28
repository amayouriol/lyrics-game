import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { refreshAccessToken, SpotifySessionExpiredError } from "./spotify";

export interface SessionData {
  accessToken?: string;
  refreshToken?: string;
  /** epoch ms when accessToken stops being valid */
  expiresAt?: number;
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
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export function hasActiveSession(session: SessionData): boolean {
  return Boolean(session.accessToken && session.refreshToken && session.expiresAt);
}

const REFRESH_BUFFER_MS = 60_000;

/**
 * Returns a Spotify access token guaranteed valid for immediate use,
 * refreshing it first if it's expired (or about to be). Destroys the
 * session and throws SpotifySessionExpiredError if refreshing fails,
 * so callers can send the user back to the login screen.
 */
export async function getValidAccessToken(): Promise<string> {
  const session = await getSession();
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
    await session.save();
    return session.accessToken;
  } catch {
    await session.destroy();
    throw new SpotifySessionExpiredError("Refresh failed");
  }
}
