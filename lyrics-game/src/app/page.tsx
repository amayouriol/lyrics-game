import { Header } from "@/components/Header";
import { getSession, hasActiveSession } from "@/lib/session";
import { HomeClient } from "./HomeClient";
import styles from "./page.module.css";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const session = await getSession();
  if (hasActiveSession(session)) {
    return (
      <>
        <Header />
        <HomeClient />
      </>
    );
  }

  const { expired } = await searchParams;

  return (
    <main className={styles.main}>
      <div className={styles.logo}>Lyrics Game</div>

      {expired && (
        <div className={styles.banner}>
          Your session expired. Reconnect and you&apos;ll land right back on your home page.
        </div>
      )}

      <h1 className={styles.headline}>Finish the line. Your songs this time.</h1>
      <p className={styles.description}>
        Connect your Spotify Premium account, pick anything from your playlists or liked songs,
        and type the missing words as the song plays.
      </p>

      {/* Plain link: a server route, not a page Next.js should prefetch. */}
      <a href="/api/auth/login" className="btn btn--lg">
        Connect with Spotify
      </a>

      <p className={styles.note}>
        Premium is required for full-song playback. Only your account can sign in to this build.
      </p>
    </main>
  );
}
