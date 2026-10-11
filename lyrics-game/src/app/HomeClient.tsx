"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowIcon, KeyboardIcon, MicIcon, PlayIcon } from "@/components/icons";
import { DIFFICULTIES } from "@/lib/game";
import type { Game, MissedWord, OverallStats } from "@/lib/progress";
import { playHref, songHref } from "./library/song/[trackId]/loadSong";
import styles from "./home.module.css";

type BriefGame = Omit<Game, "words">;

interface Progress {
  /** Typed games, and sung ones once there are any (Phase 8). */
  overall: { typed: OverallStats; sung: OverallStats | null };
  /** Songs in a row at 80% or more (Phase 9). */
  currentStreak: number;
  recent: BriefGame[];
  best: BriefGame[];
  missed: MissedWord[];
  unavailable: string[];
}

type Loaded = { status: "ready"; progress: Progress; loadedAt: number } | { status: "error" };

async function loadProgress(): Promise<Progress | "expired" | "error"> {
  try {
    const res = await fetch("/api/progress");
    if (res.status === 401) return "expired";
    if (!res.ok) return "error";
    return (await res.json()) as Progress;
  } catch {
    return "error";
  }
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600_000],
  ["month", 30 * 24 * 3600_000],
  ["week", 7 * 24 * 3600_000],
  ["day", 24 * 3600_000],
  ["hour", 3600_000],
  ["minute", 60_000],
];

/** "2 days ago", "just now". */
function timeAgo(then: number, now: number): string {
  const elapsed = now - then;
  for (const [unit, ms] of UNITS) {
    if (elapsed >= ms) return relative.format(-Math.floor(elapsed / ms), unit);
  }
  return "just now";
}

export function HomeClient({ name }: { name: string | null }) {
  const router = useRouter();
  const [reloadKey, setReloadKey] = useState(0);
  const [loaded, setLoaded] = useState<{ key: number; value: Loaded } | null>(null);

  useEffect(() => {
    let ignore = false;
    loadProgress().then((result) => {
      if (ignore) return;
      if (result === "expired") {
        router.push("/?expired=1");
        return;
      }
      setLoaded({
        key: reloadKey,
        value:
          result === "error"
            ? { status: "error" }
            : { status: "ready", progress: result, loadedAt: Date.now() },
      });
    });
    return () => {
      ignore = true;
    };
  }, [reloadKey, router]);

  const state = loaded && loaded.key === reloadKey ? loaded.value : null;
  const progress = state?.status === "ready" ? state.progress : null;
  const firstTime =
    progress !== null &&
    progress.overall.typed.songsPlayed + (progress.overall.sung?.songsPlayed ?? 0) === 0;
  // "Jane Doe" → "Jane".
  const firstName = name?.split(/\s+/)[0];

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>
            {firstTime ? "Welcome to Lyric Drop" : `Welcome back${firstName ? `, ${firstName}` : ""}`}
          </p>
          {firstTime ? (
            <>
              <h1>
                <em>Welcome.</em>
              </h1>
              <p className={styles.intro}>Play your first song to start tracking your progress.</p>
            </>
          ) : (
            <h1>
              Ready for
              <br />
              <em>another song?</em>
            </h1>
          )}
          <Link href="/library" className={styles.primaryAction}>
            <span>Pick a song</span>
            <i>
              <ArrowIcon />
            </i>
          </Link>
        </div>

        {state?.status === "ready" && !firstTime && <ProgressBoard progress={state.progress} />}
      </section>

      {!state && <p className={styles.hint}>Loading your progress…</p>}

      {state?.status === "error" && (
        <div className={styles.errorPanel}>
          <h2>Your progress didn&apos;t load.</h2>
          <p>Your games are still saved. It&apos;s probably a blip.</p>
          <button className={styles.retry} onClick={() => setReloadKey((k) => k + 1)}>
            Retry
          </button>
        </div>
      )}

      {state?.status === "ready" && !firstTime && (
        <History progress={state.progress} now={state.loadedAt} />
      )}
    </main>
  );
}

/** The record with your current streak, and your totals beside it. Nothing to click. */
function ProgressBoard({ progress }: { progress: Progress }) {
  const { typed, sung } = progress.overall;
  const streak = progress.currentStreak;
  const stats = [
    { value: typed.songsPlayed, label: sung ? "Songs typed" : "Songs played" },
    { value: typed.wordsGuessed, label: "Words guessed" },
    { value: `${typed.accuracy}%`, label: "Accuracy" },
    { value: typed.bestStreak, label: "Best streak" },
    ...(sung ? [{ value: sung.songsPlayed, label: "Songs sung" }] : []),
  ];

  return (
    <div className={styles.board}>
      <div className={styles.boardHeading}>
        <span>Your progress</span>
        <small>All-time totals</small>
      </div>
      <div className={styles.boardContent}>
        <div className={styles.recordWrap}>
          <div
            className={styles.record}
            role="img"
            aria-label={`Current streak: ${streak} ${streak === 1 ? "song" : "songs"} in a row at 80% or more`}
            title="Songs in a row at 80% or more"
          >
            <span className={styles.grooves} aria-hidden="true" />
            <span className={styles.recordCenter} aria-hidden="true">
              <small>Current streak</small>
              <strong>{String(streak).padStart(2, "0")}</strong>
              <b>{streak === 1 ? "song" : "songs"}</b>
            </span>
          </div>
          <Notes />
        </div>
        <div className={styles.metrics}>
          {stats.map((stat) => (
            <div className={styles.stat} key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Four music notes floating around the record. */
function Notes() {
  const big = (
    <>
      <path d="M14 43V9l22-5v32" />
      <ellipse cx="8" cy="46" rx="7" ry="5" />
      <ellipse cx="30" cy="39" rx="7" ry="5" />
    </>
  );
  const small = (
    <>
      <path d="M11 34V6l16 5" />
      <ellipse cx="6" cy="37" rx="6" ry="4" />
    </>
  );
  return (
    <div className={styles.notes} aria-hidden="true">
      <svg className={`${styles.note} ${styles.noteA}`} viewBox="0 0 42 58">
        {big}
      </svg>
      <svg className={`${styles.note} ${styles.noteB}`} viewBox="0 0 32 46">
        {small}
      </svg>
      <svg className={`${styles.note} ${styles.noteC}`} viewBox="0 0 42 58">
        {big}
      </svg>
      <svg className={`${styles.note} ${styles.noteD}`} viewBox="0 0 32 46">
        {small}
      </svg>
    </div>
  );
}

function History({ progress, now }: { progress: Progress; now: number }) {
  const { recent, best, missed, unavailable } = progress;
  const gone = new Set(unavailable);
  // Marks in Top performances only matter once both typed and sung games are listed.
  const hasBoth = best.some((g) => g.mode === "sing") && best.some((g) => g.mode !== "sing");

  return (
    <section className={styles.history}>
      <div className={styles.column}>
        <h2>Recently played</h2>
        <div className={styles.rows}>
          {recent.map((game) => (
            <div key={game.id} className={styles.row}>
              <SongLink game={game}>
                {game.mode === "sing" && <ModeMark mode="sing" />}
                {DIFFICULTIES[game.level].label} · {game.score.toLocaleString("en")} pts ·{" "}
                {timeAgo(game.playedAt, now)}
              </SongLink>
              {gone.has(game.song.trackId) ? (
                <span className={styles.gone}>No longer available</span>
              ) : (
                <Link
                  href={playHref(game.song.trackId, null, game.level, game.mode ?? "type")}
                  className={styles.playAgain}
                  aria-label={`Play again ${game.song.title}`}
                  title={`Play again on ${DIFFICULTIES[game.level].label}`}
                >
                  <PlayIcon />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={`${styles.column} ${styles.bestColumn}`}>
        <h2>Top performances</h2>
        <div className={styles.rows}>
          {best.map((game) => (
            <div key={game.id} className={styles.row}>
              <SongLink game={game}>
                {hasBoth && <ModeMark mode={game.mode ?? "type"} />}
                {game.mode === "sing" ? "Sung" : "Typed"} on {DIFFICULTIES[game.level].label}
              </SongLink>
              <span className={styles.score}>{game.accuracy}%</span>
            </div>
          ))}
        </div>
      </div>

      <MissedCard missed={missed} />
    </section>
  );
}

/** Your most-missed word as a stack of cards. The practice queue is V2: shown, not clickable. */
function MissedCard({ missed }: { missed: MissedWord[] }) {
  const top = missed[0];
  return (
    <div
      className={styles.flashcard}
      tabIndex={0}
      aria-label={
        top
          ? `Words that keep dropping: ${top.word}, missed ${top.misses} of ${top.seen} times. Start practice queue: coming soon.`
          : "Words that keep dropping: no repeat misses yet."
      }
    >
      <span className={`${styles.layer} ${styles.cardWhite}`} aria-hidden="true" />
      <span className={`${styles.layer} ${styles.cardLight}`} aria-hidden="true" />
      <span className={`${styles.layer} ${styles.cardLavender}`} aria-hidden="true" />
      <span className={styles.front} aria-hidden="true" />
      <span className={styles.cardDefault} aria-hidden="true">
        <strong className={styles.cardTitle}>Words that keep dropping</strong>
        {top ? (
          <>
            <span className={styles.word}>{top.word}</span>
            <span className={styles.cardMeta}>
              <b>
                {missed.length} {missed.length === 1 ? "word" : "words"} to practice
              </b>
              <small>
                Missed {top.misses} of {top.seen} times
              </small>
              <small>
                {top.songs.length === 1 ? `in ${top.songs[0]}` : `in ${top.songs.length} songs`}
              </small>
            </span>
          </>
        ) : (
          <span className={styles.noMisses}>No repeat misses yet. Nice.</span>
        )}
      </span>
      <span className={styles.cardBack} aria-hidden="true">
        Start practice queue
        <em>Coming soon</em>
      </span>
    </div>
  );
}

/** A small microphone (sung) or keyboard (typed) before a game's details. */
function ModeMark({ mode }: { mode: "type" | "sing" }) {
  return (
    <span className={styles.modeMark} title={mode === "sing" ? "Sung" : "Typed"}>
      {mode === "sing" ? <MicIcon /> : <KeyboardIcon />}
    </span>
  );
}

/** Cover, title, artist and a line of details, opening the song screen. */
function SongLink({ game, children }: { game: BriefGame; children: ReactNode }) {
  return (
    <Link href={songHref(game.song.trackId, null)} className={styles.song}>
      <span
        className={styles.cover}
        style={game.song.cover ? { backgroundImage: `url(${game.song.cover})` } : undefined}
      >
        {!game.song.cover && <b>{game.song.title.slice(0, 1)}</b>}
      </span>
      <span className={styles.songInfo}>
        <strong>{game.song.title}</strong>
        <span>{game.song.artist}</span>
        <small className={styles.meta}>{children}</small>
      </span>
    </Link>
  );
}
