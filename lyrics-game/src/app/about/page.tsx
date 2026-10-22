import Link from "next/link";
import { notFound } from "next/navigation";
import { isWebMode } from "@/lib/app-mode";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

/** What the web version keeps and where things come from. Open without the shared word. */
export default function AboutPage() {
  if (!isWebMode()) notFound();

  return (
    <main className={styles.main}>
      <Link href="/" className={styles.logo}>
        Lyric Drop
      </Link>
      <h1 className={styles.headline}>About and privacy.</h1>
      <p className={styles.lead}>
        Lyric Drop is a small personal project: a game where you finish the missing words of a
        song you love. This page says what it keeps and where things come from.
      </p>

      <section>
        <h2>What is kept about you</h2>
        <ul>
          <li>
            <b>A random id</b> in a cookie in your browser. It is not your name or your email,
            and nobody asked you for either.
          </li>
          <li>
            <b>Under that id:</b> the songs and lists you add, the songs you save, and your
            finished games (the score and the words you missed).
          </li>
          <li>
            <b>A second cookie</b> that remembers you typed the shared word, so you aren&apos;t
            asked again.
          </li>
          <li>
            <b>A daily count</b> of your searches and playlist imports, so YouTube&apos;s free
            allowance lasts for everyone.
          </li>
        </ul>
        <p>
          There are no ads, no analytics and no trackers of its own. Nothing is sold or shared. The
          hosts (Vercel and Upstash) keep the usual server records of requests. If you
          clear your browser&apos;s cookies, you start from zero, and the old id can no longer be
          reached.
        </p>
      </section>

      <section>
        <h2>What is shared by everyone</h2>
        <p>
          The lyrics found for a song, and the YouTube video chosen for it, are kept for all
          players, so a song one friend added is quick for the next.
        </p>
      </section>

      <section>
        <h2>Where things come from</h2>
        <ul>
          <li>
            <b>Songs and video:</b> YouTube. They play in YouTube&apos;s own player, with its
            ads, and YouTube&apos;s{" "}
            <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">
              terms
            </a>{" "}
            and{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
              privacy policy
            </a>{" "}
            apply there. The game never downloads the audio or hides the player.
          </li>
          <li>
            <b>Lyrics:</b>{" "}
            <a href="https://lrclib.net" target="_blank" rel="noreferrer">
              LRCLIB
            </a>
            , a community service. They are not licensed for public use, which is why this game
            is only for friends, shows only the current line, and hides words as you play.
          </li>
          <li>
            <b>Where it is kept:</b> a free database (Upstash) and a free host (Vercel).
          </li>
        </ul>
      </section>

      <section>
        <h2>Questions or removal</h2>
        <p>
          Ask whoever sent you the link. They can remove a song or its lyrics for everyone. Your
          own games and songs are only reachable from this browser, so clearing its cookies is
          how you leave nothing reachable behind.
        </p>
      </section>

      <Link href="/enter" className={styles.back}>
        Back
      </Link>
    </main>
  );
}
