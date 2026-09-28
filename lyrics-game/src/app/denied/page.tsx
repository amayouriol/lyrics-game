import Link from "next/link";
import styles from "./page.module.css";

export default function DeniedPage() {
  return (
    <main className={styles.main}>
      <div className={styles.logo}>Lyrics Game</div>
      <h1 className={styles.headline}>Login is required.</h1>
      <p className={styles.description}>
        You cancelled the Spotify permission screen, so there&apos;s no library to play from.
        Nothing was saved.
      </p>
      <Link href="/api/auth/login" className="btn btn--lg">
        Try again
      </Link>
    </main>
  );
}
