import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Spotify redirect URI has to be an IP (127.0.0.1), not "localhost",
  // so dev mode needs to allow it explicitly or the HMR socket gets blocked
  // as cross-origin and reload-loops the page before data can load.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
