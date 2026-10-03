import styles from "./StatBlock.module.css";

type Tone = "primary" | "secondary" | "tertiary" | "quaternary" | "grey";

/** The design's StatBlock: label, big value, hint, on a tinted card. */
export function StatBlock({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone: Tone;
}) {
  return (
    <div
      className={styles.block}
      style={{
        background: `var(--${tone}-100)`,
        ["--tone-600" as string]: `var(--${tone}-600)`,
        ["--tone-700" as string]: `var(--${tone}-700)`,
      }}
    >
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}
