/**
 * Two ways to run the same code. Your own copy (the default) has Spotify and
 * keeps its data in files. The web version (`APP_MODE=web`) is YouTube only:
 * no Spotify anywhere, nothing of it reachable.
 */
export function isWebMode(): boolean {
  return process.env.APP_MODE === "web";
}

/** For routes that only make sense with Spotify: in web mode they answer "not available". */
export function notAvailableInWeb(): Response | null {
  return isWebMode() ? Response.json({ error: "not_available" }, { status: 404 }) : null;
}
