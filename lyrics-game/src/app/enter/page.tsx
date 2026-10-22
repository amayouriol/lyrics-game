import Link from "next/link";
import { notFound } from "next/navigation";
import { isWebMode } from "@/lib/app-mode";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

/** The web version's front door: the shared word, asked once per browser. */
export default async function EnterPage({
  searchParams,
}: {
  searchParams: Promise<{ wrong?: string; wait?: string }>;
}) {
  if (!isWebMode()) notFound();
  const { wrong, wait } = await searchParams;

  return (
    <main className={styles.main}>
      <div className={styles.logo}>Lyric Drop</div>
      <h1 className={styles.headline}>Enter the word.</h1>
      <p className={styles.description}>
        This is a small game for friends. Ask whoever sent you the link for the word.
      </p>
      <form className={styles.form} action="/api/gate" method="POST">
        <label htmlFor="word">The word</label>
        <input
          id="word"
          name="word"
          type="password"
          autoComplete="off"
          autoCapitalize="none"
          maxLength={200}
          required
          autoFocus
          aria-describedby={wrong || wait ? "problem" : undefined}
        />
        {wrong && (
          <p id="problem" className={styles.problem} role="alert">
            That&apos;s not the word. Try again.
          </p>
        )}
        {wait && (
          <p id="problem" className={styles.problem} role="alert">
            Too many tries. Wait an hour and try again.
          </p>
        )}
        <button type="submit" className="btn btn--lg">
          Come in
        </button>
      </form>
      <Link href="/about" className={styles.about}>
        About and privacy
      </Link>
    </main>
  );
}
