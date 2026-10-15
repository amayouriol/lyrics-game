import Link from "next/link";
import styles from "./wrongVideo.module.css";

/**
 * Sits just above YouTube's corner player. Leads to the song screen, where
 * another video can be chosen and saved (your game here isn't kept).
 */
export function WrongVideoLink({ href }: { href: string }) {
  return (
    <Link href={href} className={styles.link}>
      Wrong video?
    </Link>
  );
}
