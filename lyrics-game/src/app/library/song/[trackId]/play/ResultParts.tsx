import { ArrowIcon } from "@/components/icons";
import styles from "./play.module.css";

/** The verdict, huge: its last sentence in violet ("You actually listen. Respect."). */
export function Verdict({ text }: { text: string }) {
  const cut = text.lastIndexOf(". ");
  return (
    <h1 className={styles.verdict}>
      {cut === -1 ? (
        text
      ) : (
        <>
          {text.slice(0, cut + 1)} <em>{text.slice(cut + 2)}</em>
        </>
      )}
    </h1>
  );
}

/** One result number, in the home page's tile style. */
export function ResultTile({
  value,
  label,
  hint,
}: {
  value: string | number;
  label: string;
  hint: string;
}) {
  return (
    <div className={styles.resultTile}>
      <strong>{typeof value === "number" ? value.toLocaleString("en") : value}</strong>
      <span>{label}</span>
      <small>{hint}</small>
    </div>
  );
}

/** The light "Play again" button with its arrow. */
export function PlayAgain({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className={styles.again} onClick={onClick}>
      {label}
      <i>
        <ArrowIcon />
      </i>
    </button>
  );
}
