import type { BlankState } from "@/lib/game";
import styles from "./LyricBlank.module.css";

/** The design's LyricBlank: one hidden word, in any of its states. */
export function LyricBlank({
  answer,
  value = "",
  state,
  wrongTries = 0,
  onChange,
  onSubmit,
}: {
  answer: string;
  value?: string;
  state: Exclude<BlankState, "future">;
  /** Wrong tries so far: the active box shakes and turns red after one. */
  wrongTries?: number;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}) {
  const width = `${Math.max(answer.length, 3) + 1}ch`;

  if (state === "active") {
    return (
      <input
        className={`${styles.blank} ${styles.input} ${wrongTries > 0 ? styles.retry : ""}`}
        style={{ width, minWidth: width }}
        value={value}
        autoFocus
        aria-label="Missing word"
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit?.(value);
        }}
      />
    );
  }
  if (state === "correct") {
    return (
      <span className={`${styles.blank} ${styles.correct}`} style={{ minWidth: width }}>
        {answer}
      </span>
    );
  }
  if (state === "wrong") {
    return (
      <span className={`${styles.blank} ${styles.wrong}`} style={{ minWidth: width }}>
        {value && <s className={styles.guess}>{value}</s>}
        {answer}
      </span>
    );
  }
  if (state === "revealed") {
    return (
      <span className={`${styles.blank} ${styles.revealed}`} style={{ minWidth: width }}>
        {answer}
      </span>
    );
  }
  // "waiting": a later blank on the current line, not typeable yet.
  return (
    <span className={`${styles.blank} ${styles.waiting}`} style={{ minWidth: width }}>
      {" "}
    </span>
  );
}
