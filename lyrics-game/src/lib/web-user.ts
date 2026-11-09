import { sealData, unsealData } from "iron-session";

/**
 * Who is signed in on the web version, kept in a signed and encrypted cookie
 * (the key is AUTH_SECRET). The sign-in's one-time values ride in a second
 * short cookie while you are at Google.
 */
export const USER_COOKIE = "lyric_drop_user";
export const LOGIN_COOKIE = "lyric_drop_login";
/** The random id cookie of before Google sign-in; read once to carry old data over (see adopt-person.ts). */
export const PERSON_COOKIE = "lyric_drop_person";

const YEAR = 60 * 60 * 24 * 365;
const TEN_MINUTES = 60 * 10;

export interface WebUser {
  id: string;
  name: string | null;
  picture: string | null;
}

export interface LoginTry {
  state: string;
  verifier: string;
}

/** The key, or null if it isn't set or is too short (then nobody can sign in: fail closed). */
export function authSecret(): string | null {
  const secret = process.env.AUTH_SECRET ?? "";
  return secret.length >= 32 ? secret : null;
}

function isWebUser(value: unknown): value is WebUser {
  const user = value as WebUser | null;
  return (
    typeof user?.id === "string" &&
    /^g-[0-9A-Za-z_-]{1,255}$/.test(user.id) &&
    (user.name === null || typeof user.name === "string") &&
    (user.picture === null || typeof user.picture === "string")
  );
}

export const USER_COOKIE_AGE = YEAR;
export const LOGIN_COOKIE_AGE = TEN_MINUTES;

export function sealUser(user: WebUser, secret: string): Promise<string> {
  return sealData({ id: user.id, name: user.name, picture: user.picture }, { password: secret, ttl: YEAR });
}

/** The signed-in person, or null for no cookie, a changed one, an old one or a different key. */
export async function readUser(cookie: string | undefined, secret: string | null): Promise<WebUser | null> {
  if (!cookie || !secret) return null;
  try {
    const data = await unsealData<WebUser>(cookie, { password: secret, ttl: YEAR });
    return isWebUser(data) ? { id: data.id, name: data.name, picture: data.picture } : null;
  } catch {
    return null;
  }
}

export function sealLogin(attempt: LoginTry, secret: string): Promise<string> {
  return sealData({ state: attempt.state, verifier: attempt.verifier }, { password: secret, ttl: TEN_MINUTES });
}

export async function readLogin(cookie: string | undefined, secret: string | null): Promise<LoginTry | null> {
  if (!cookie || !secret) return null;
  try {
    const data = await unsealData<LoginTry>(cookie, { password: secret, ttl: TEN_MINUTES });
    return typeof data?.state === "string" && typeof data?.verifier === "string" ? data : null;
  } catch {
    return null;
  }
}
