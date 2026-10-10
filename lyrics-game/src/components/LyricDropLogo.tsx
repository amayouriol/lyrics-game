import styles from "./LyricDropLogo.module.css";

/** The Lyric Drop wordmark: the O drops out of "DROP" and leaves a _. */
export function LyricDropLogo() {
  return (
    <span className={styles.wordmark} aria-hidden="true">
      <span>Lyric</span>
      <span className={styles.drop}>
        Dr
        <i>o</i>
        <b>_</b>p
      </span>
    </span>
  );
}
