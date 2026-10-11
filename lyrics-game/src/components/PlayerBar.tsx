import styles from "./PlayerBar.module.css";

function fmt(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The player bar under the lyrics: cover, title/artist, play/pause, elapsed, progress, total. */
export function PlayerBar({
  title,
  artist,
  cover,
  playing,
  positionSec,
  durationSec,
  onToggle,
  disabled,
}: {
  title: string;
  artist: string;
  cover: string | null;
  playing: boolean;
  positionSec: number;
  durationSec: number;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const pct = durationSec ? Math.min(100, (positionSec / durationSec) * 100) : 0;
  return (
    <div className={styles.bar}>
      <div className={styles.track}>
        <div
          className={styles.cover}
          style={cover ? { backgroundImage: `url(${cover})` } : undefined}
        />
        <div className={styles.text}>
          <div className={styles.title}>{title}</div>
          <div className={styles.artist}>{artist}</div>
        </div>
      </div>
      <button
        type="button"
        className={styles.toggle}
        onClick={onToggle}
        disabled={disabled}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5h3v14H8zM13 5h3v14h-3z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5.5v13l10.5-6.5z" />
          </svg>
        )}
      </button>
      <span className={styles.time}>{fmt(positionSec)}</span>
      <div className={styles.progress}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.time}>{fmt(durationSec)}</span>
    </div>
  );
}
