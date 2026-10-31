/**
 * Sign in with Google for the web version (Phase 16), written by hand: a
 * redirect to Google, then one server-to-server call that swaps the code for
 * the person's name. Name, email and picture only; no Google token is kept.
 */
export const GOOGLE_SCOPE = "openid email profile";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export class GoogleSignInError extends Error {}

export interface GoogleUser {
  /** Our id for this person: `g-` plus Google's stable account id (never the email, which can change). */
  id: string;
  name: string | null;
  email: string | null;
  picture: string | null;
}

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
}

/** The keys from the settings, or null when they aren't set (then sign-in is off, not open). */
export function googleConfig(): GoogleConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

function base64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

/** The one-time values for one sign-in try: `state` ties the way back to this browser, the verifier/challenge pair is PKCE. */
export async function newLoginStart(): Promise<{ state: string; verifier: string; challenge: string }> {
  const state = base64url(crypto.getRandomValues(new Uint8Array(24)));
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(48)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { state, verifier, challenge: base64url(new Uint8Array(digest)) };
}

export function authUrl(clientId: string, redirectUri: string, state: string, challenge: string): string {
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPE,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    // Lets a friend with several Google accounts pick the right one.
    prompt: "select_account",
  }).toString();
  return url.toString();
}

/** Same length strings compared without stopping at the first difference. */
export function sameState(a: string | undefined, b: string | null): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

/**
 * Reads who the ID token says you are. The token comes straight from Google's
 * own address over HTTPS, so its signature needn't be checked again (OpenID
 * allows this); who it is for, who made it and that it hasn't run out are.
 */
export function readIdToken(idToken: unknown, clientId: string, nowSeconds: number): GoogleUser {
  if (typeof idToken !== "string") throw new GoogleSignInError("no_token");
  const part = idToken.split(".")[1];
  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(Buffer.from(part ?? "", "base64url").toString("utf8"));
  } catch {
    throw new GoogleSignInError("bad_token");
  }
  if (!claims || typeof claims !== "object") throw new GoogleSignInError("bad_token");
  if (claims.iss !== "https://accounts.google.com" && claims.iss !== "accounts.google.com") {
    throw new GoogleSignInError("wrong_issuer");
  }
  if (claims.aud !== clientId) throw new GoogleSignInError("wrong_audience");
  if (typeof claims.exp !== "number" || claims.exp <= nowSeconds) throw new GoogleSignInError("expired");
  const sub = claims.sub;
  if (typeof sub !== "string" || !/^[0-9A-Za-z_-]{1,255}$/.test(sub)) throw new GoogleSignInError("no_account");
  const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim().slice(0, 200) : null);
  const picture = text(claims.picture);
  return {
    id: `g-${sub}`,
    name: text(claims.name),
    email: text(claims.email),
    // Only a secure picture address is ever shown.
    picture: picture?.startsWith("https://") ? picture : null,
  };
}

/** Swaps the code Google sent back for who you are. `fetchImpl` is only swapped in checks. */
export async function exchangeCode(
  code: string,
  verifier: string,
  redirectUri: string,
  config: GoogleConfig,
  fetchImpl: typeof fetch = fetch,
  nowSeconds = Math.floor(Date.now() / 1000)
): Promise<GoogleUser> {
  const response = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    cache: "no-store",
  }).catch(() => null);
  if (!response || !response.ok) throw new GoogleSignInError("exchange_failed");
  const body = (await response.json().catch(() => null)) as { id_token?: unknown } | null;
  return readIdToken(body?.id_token, config.clientId, nowSeconds);
}
