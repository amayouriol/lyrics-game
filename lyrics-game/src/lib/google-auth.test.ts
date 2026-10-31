/** Sign in with Google (Phase 16): run with `npm test`. Google is faked; nothing leaves this computer. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { authUrl, callbackUrl, exchangeCode, GoogleSignInError, newLoginStart, readIdToken, sameState } from "./google-auth.ts";
import { readLogin, readUser, sealLogin, sealUser } from "./web-user.ts";

const CLIENT = "client-123.apps.googleusercontent.com";
const NOW = 1_800_000_000;
const SECRET = "a-secret-that-is-at-least-32-chars-long!";

function token(claims: Record<string, unknown>): string {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "RS256" })}.${part(claims)}.signature`;
}

const good = {
  iss: "https://accounts.google.com",
  aud: CLIENT,
  exp: NOW + 3600,
  sub: "110248495921238986420",
  name: "Ana Perez",
  email: "ana@example.com",
  picture: "https://lh3.googleusercontent.com/a/photo",
};

function refuses(run: () => unknown, why: string) {
  assert.throws(run, (error) => error instanceof GoogleSignInError && error.message === why);
}

describe("reading Google's ID token", () => {
  it("gives our id from Google's account id, not the email", () => {
    const user = readIdToken(token(good), CLIENT, NOW);
    assert.deepEqual(user, {
      id: "g-110248495921238986420",
      name: "Ana Perez",
      email: "ana@example.com",
      picture: "https://lh3.googleusercontent.com/a/photo",
    });
  });

  it("accepts the short issuer name too", () => {
    assert.equal(readIdToken(token({ ...good, iss: "accounts.google.com" }), CLIENT, NOW).id.startsWith("g-"), true);
  });

  it("refuses a token for another app, from another maker, expired, or without an account", () => {
    refuses(() => readIdToken(token({ ...good, aud: "someone-else" }), CLIENT, NOW), "wrong_audience");
    refuses(() => readIdToken(token({ ...good, iss: "https://evil.example" }), CLIENT, NOW), "wrong_issuer");
    refuses(() => readIdToken(token({ ...good, exp: NOW - 1 }), CLIENT, NOW), "expired");
    refuses(() => readIdToken(token({ ...good, exp: undefined }), CLIENT, NOW), "expired");
    refuses(() => readIdToken(token({ ...good, sub: undefined }), CLIENT, NOW), "no_account");
    refuses(() => readIdToken(token({ ...good, sub: "../../etc" }), CLIENT, NOW), "no_account");
  });

  it("refuses junk and a missing token", () => {
    refuses(() => readIdToken(undefined, CLIENT, NOW), "no_token");
    refuses(() => readIdToken("not-a-token", CLIENT, NOW), "bad_token");
  });

  it("keeps a missing name or a plain-http picture as nothing", () => {
    const user = readIdToken(token({ ...good, name: undefined, picture: "http://x.example/p.png" }), CLIENT, NOW);
    assert.equal(user.name, null);
    assert.equal(user.picture, null);
  });
});

describe("starting a sign-in", () => {
  it("makes a new state each time, and the challenge is the verifier's fingerprint", async () => {
    const a = await newLoginStart();
    const b = await newLoginStart();
    assert.notEqual(a.state, b.state);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(a.verifier));
    assert.equal(a.challenge, Buffer.from(digest).toString("base64url"));
  });

  it("builds Google's address with the state and PKCE, asking only for name, email and picture", () => {
    const url = new URL(authUrl(CLIENT, "https://app.example/api/auth/google/callback", "S", "C"));
    assert.equal(url.origin + url.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
    assert.equal(url.searchParams.get("scope"), "openid email profile");
    assert.equal(url.searchParams.get("state"), "S");
    assert.equal(url.searchParams.get("code_challenge"), "C");
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
    assert.equal(url.searchParams.get("redirect_uri"), "https://app.example/api/auth/google/callback");
  });

  it("sends people back to this site's own address, using the forwarded host behind Vercel", () => {
    assert.equal(
      callbackUrl("http://localhost:3000/api/auth/google", null, null),
      "http://localhost:3000/api/auth/google/callback"
    );
    assert.equal(
      callbackUrl("http://internal:3000/x", "friends.example.com", "https"),
      "https://friends.example.com/api/auth/google/callback"
    );
    // Anything but a plain "http" is treated as https, so an odd header can't downgrade it to something else.
    assert.equal(callbackUrl("http://a/x", "b.example", "ftp"), "https://b.example/api/auth/google/callback");
  });

  it("compares the state, and a missing one never matches", () => {
    assert.equal(sameState("abc", "abc"), true);
    assert.equal(sameState("abc", "abd"), false);
    assert.equal(sameState("abc", "abcd"), false);
    assert.equal(sameState(undefined, "abc"), false);
    assert.equal(sameState("abc", null), false);
  });
});

describe("swapping the code", () => {
  const config = { clientId: CLIENT, clientSecret: "shh" };

  it("sends the code and the verifier to Google and returns who you are", async () => {
    let sent: URLSearchParams | undefined;
    const fake = (async (_url: string, init: RequestInit) => {
      sent = init.body as URLSearchParams;
      return Response.json({ id_token: token(good) });
    }) as unknown as typeof fetch;
    const user = await exchangeCode("the-code", "the-verifier", "https://app/cb", config, fake, NOW);
    assert.equal(user.id, "g-110248495921238986420");
    assert.equal(sent?.get("code"), "the-code");
    assert.equal(sent?.get("code_verifier"), "the-verifier");
    assert.equal(sent?.get("grant_type"), "authorization_code");
  });

  it("refuses when Google says no, is unreachable, or sends no token", async () => {
    const no = (async () => new Response("{}", { status: 400 })) as unknown as typeof fetch;
    const down = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    const empty = (async () => Response.json({})) as unknown as typeof fetch;
    await assert.rejects(exchangeCode("c", "v", "r", config, no, NOW), GoogleSignInError);
    await assert.rejects(exchangeCode("c", "v", "r", config, down, NOW), GoogleSignInError);
    await assert.rejects(exchangeCode("c", "v", "r", config, empty, NOW), GoogleSignInError);
  });
});

describe("the signed cookies", () => {
  const user = { id: "g-123", name: "Ana", picture: null };

  it("a sealed user reads back, and the cookie does not show the id", async () => {
    const sealed = await sealUser(user, SECRET);
    assert.equal(sealed.includes("g-123"), false);
    assert.deepEqual(await readUser(sealed, SECRET), user);
  });

  it("no cookie, a changed cookie, another key or no key all read as signed out", async () => {
    const sealed = await sealUser(user, SECRET);
    assert.equal(await readUser(undefined, SECRET), null);
    assert.equal(await readUser(sealed.slice(0, -3) + "abc", SECRET), null);
    assert.equal(await readUser(sealed, "another-secret-that-is-32-chars-long!!"), null);
    assert.equal(await readUser(sealed, null), null);
    assert.equal(await readUser("junk", SECRET), null);
  });

  it("refuses a sealed value whose id is not a Google one", async () => {
    const forged = await sealUser({ id: "../other", name: null, picture: null }, SECRET);
    assert.equal(await readUser(forged, SECRET), null);
  });

  it("the sign-in's one-time values read back only with the same key", async () => {
    const sealed = await sealLogin({ state: "S", verifier: "V" }, SECRET);
    assert.deepEqual(await readLogin(sealed, SECRET), { state: "S", verifier: "V" });
    assert.equal(await readLogin(sealed, "another-secret-that-is-32-chars-long!!"), null);
    // A signed-in cookie is not a sign-in try.
    assert.equal(await readLogin(await sealUser(user, SECRET), SECRET), null);
  });
});
