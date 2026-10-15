"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { ArrowIcon } from "@/components/icons";
import type { Profile } from "@/lib/session";
import { LyricBlank } from "@/components/LyricBlank";
import { PlayerBar } from "@/components/PlayerBar";
import {
  DIFFICULTIES,
  nextDifficulty,
  tokenize,
  verdict,
  type Difficulty,
  type TimedLine,
} from "@/lib/game";
import type { WordResult } from "@/lib/progress";
import {
  isLineOver,
  lineCounts,
  matchSung,
  SING_DESCRIPTIONS,
  SING_WAIT_MS,
  singLines,
  singStats,
  singWaits,
  type SingStats,
  type SungLine,
} from "@/lib/sing";
import type { TrackSummary } from "../loadSong";
import { useLineGlide, useSweep } from "./lyricsMotion";
import type { ListeningProblem } from "./useListening";
import { useListening } from "./useListening";
import { usePlayback } from "./usePlayback";
import { WrongVideoLink } from "./WrongVideoLink";
import type { PlayerError } from "./playerTypes";
import { PlayAgain, ResultTile, Verdict } from "./ResultParts";
import styles from "./play.module.css";

/** On the last line, the song waits this close to its end (as in Type mode). */
const LAST_LINE_HOLD_MS = 1_500;

/** Not listening for longer than this in a song is mentioned on the results. */
const OFF_NOTE_MS = 3_000;

export interface SingGameResult {
  /** Made when the round starts, so the game is saved once however often it's sent. */
  id: string;
  mode: "sing";
  level: Difficulty;
  sung: SungLine[];
  stats: SingStats;
  /** Time spent not listening while the song played. */
  offMs: number;
}

const PROBLEMS: Record<ListeningProblem, string> = {
  denied:
    "Sing mode needs your microphone. Allow it from the icon at the left of the address bar, then tap the microphone above.",
  no_mic: "No microphone found. Plug one in, then tap the microphone above.",
  stopped: "Not listening. Tap the microphone above to try again.",
  unsupported: "This browser can't listen. Sing mode works in Chrome and Edge.",
};

export function SingScreen({
  trackId,
  track,
  lines,
  singable,
  level,
  listenLang,
  backHref,
  errors,
  videoId,
  onFinished,
}: {
  trackId: string;
  track: TrackSummary;
  lines: TimedLine[];
  /** The YouTube video to play; null plays the song on Spotify. */
  videoId: string | null;
  /** Per line, which words are sung for points. */
  singable: boolean[][];
  level: Difficulty;
  /** The browser's language setting to listen with ("es-US"). */
  listenLang: string;
  backHref: string;
  errors: Record<PlayerError, { title: string; body: string }>;
  onFinished: (result: SingGameResult) => void;
}) {
  const router = useRouter();
  const lineTimesMs = useMemo(() => lines.map((l) => l.timeMs), [lines]);
  const sungLines = useMemo(() => singLines(lines, level, singable), [lines, level, singable]);
  const [gameId] = useState(() => crypto.randomUUID());

  const finishRef = useRef<() => void>(() => {});
  const onEnded = useCallback(() => finishRef.current(), []);
  const {
    status,
    paused,
    held,
    heldSince,
    positionSec,
    lineIndex,
    togglePause,
    resume,
    unblock,
    retry,
    stop,
    setHoldBeforeMs,
    getPositionMs,
  } = usePlayback({ trackId, videoId, durationMs: track.durationMs, lineTimesMs, onEnded });

  // Listening goes on while the song waits for you (Easy).
  const playing = status.kind === "playing" && (!paused || held);
  const listening = useListening({ lang: listenLang, active: playing, getPositionMs });
  const sung = useMemo(
    () => matchSung(lines, sungLines, listening.heard, track.durationMs, singable),
    [lines, sungLines, listening.heard, track.durationMs, singable]
  );
  const byLine = useMemo(() => new Map(sung.map((s) => [s.line, s])), [sung]);

  const currentLine = lineIndex - 1;
  // Re-rendered every second by the player, which is fine for a line's
  // misses showing once its grace second is over.
  const positionMs = positionSec * 1000;
  const stats = singStats(sung, positionMs, level);

  // Easy: at the end of a sung line with words still missing, the song waits
  // (just before the next line) until they're all heard or the wait runs out.
  // Otherwise the music never waits in Sing mode.
  const [waitedOut, setWaitedOut] = useState<Set<number>>(() => new Set());
  const singing = byLine.get(currentLine);
  const holdBeforeMs =
    singWaits(level) &&
    singing &&
    !waitedOut.has(currentLine) &&
    lineCounts(singing).heard < lineCounts(singing).total
      ? currentLine + 1 < lines.length
        ? lines[currentLine + 1].timeMs
        : track.durationMs - LAST_LINE_HOLD_MS
      : null;
  useEffect(() => {
    setHoldBeforeMs(holdBeforeMs);
  }, [holdBeforeMs, setHoldBeforeMs]);

  // The wait's countdown, from the clock like Type mode's, so a background
  // tab (slower timers) still ends it on time.
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (heldSince === null) return;
    const line = currentLine;
    const id = setInterval(() => {
      const t = performance.now();
      setNow(t);
      if (t - heldSince >= SING_WAIT_MS) {
        clearInterval(id);
        setWaitedOut((done) => new Set(done).add(line));
      }
    }, 250);
    return () => clearInterval(id);
  }, [heldSince, currentLine]);
  const secondsLeft =
    heldSince === null
      ? null
      : Math.max(0, Math.ceil((SING_WAIT_MS - Math.max(0, now - heldSince)) / 1000));

  useEffect(() => {
    finishRef.current = () =>
      onFinished({
        id: gameId,
        mode: "sing",
        level,
        sung,
        stats: singStats(sung, Infinity, level),
        offMs: listening.getOffMs(),
      });
  });

  // Paused by you or by another device: lyrics hidden. Waiting for you is
  // different: the lyrics stay up so you can sing.
  const hidden = status.kind === "dropped" || (status.kind === "playing" && paused && !held);
  const lyricsShown = status.kind === "playing" && !hidden;
  const lyricsRef = useRef<HTMLDivElement>(null);
  useLineGlide(lyricsRef, currentLine);
  useSweep({
    lyricsRef,
    shown: lyricsShown,
    full: held,
    currentLine,
    lines,
    lastLineEndMs: track.durationMs,
    getPositionMs,
  });

  function renderLine(li: number) {
    const tokens = tokenize(lines[li].text);
    const s = byLine.get(li);
    const over = s ? isLineOver(s, positionMs) : false;
    const totalChars = tokens.reduce((n, t) => n + t.raw.length + 1, 0);
    let charsBefore = 0;
    let k = -1;

    const words = tokens.map((token, wi) => {
      const at = (charsBefore / totalChars).toFixed(3);
      charsBefore += token.raw.length + 1;
      if (!s || !token.core) {
        return (
          <span key={wi} data-at={at}>
            {token.raw}
          </span>
        );
      }
      k++;
      // Sounds and names stay as written: they aren't sung for points.
      if (!s.sing[k]) {
        return (
          <span key={wi} data-at={at}>
            {token.raw}
          </span>
        );
      }
      const state = s.heardAt[k] !== null ? "correct" : over ? "wrong" : "waiting";
      return (
        <span key={wi} className={styles.word} data-at={at}>
          {token.lead}
          <LyricBlank answer={token.core} state={state} />
          {token.trail}
        </span>
      );
    });
    if (s && over) {
      const { heard, total } = lineCounts(s);
      words.push(
        <span key="count" className={styles.lineCount}>
          {heard} of {total}
        </span>
      );
    }
    return words;
  }

  function help(): { text: string; tone: "muted" | "good" | "bad" } {
    if (listening.problem) return { text: PROBLEMS[listening.problem], tone: "bad" };
    if (currentLine < 0) return { text: "Get ready. The first line is coming.", tone: "muted" };
    if (held && secondsLeft !== null) {
      return {
        text: `The song waits for you. Finish the line: ${secondsLeft} s left.`,
        tone: secondsLeft <= 3 ? "bad" : "muted",
      };
    }
    const last = [...sung].reverse().find((s) => isLineOver(s, positionMs));
    if (last && last.line >= currentLine - 1) {
      const { heard, total } = lineCounts(last);
      return {
        text: heard === total ? "Every word. Nice." : `${heard} of ${total} words heard.`,
        tone: heard === total ? "good" : "muted",
      };
    }
    return {
      text: byLine.has(currentLine)
        ? "Sing it."
        : "Sing the hidden lines. Words fill in as they're heard.",
      tone: "muted",
    };
  }

  async function quit() {
    await stop();
    router.push(backHref);
  }

  const helpLine = help();
  const mic =
    listening.state === "failed"
      ? { label: "Not listening — tap to retry", className: styles.micOff }
      : listening.state === "on"
        ? { label: "Listening", className: listening.hearing ? styles.micHearing : styles.micOn }
        : { label: paused && !held ? "Paused" : "Starting…", className: styles.micIdle };

  return (
    <main className={styles.main}>
      {videoId && <WrongVideoLink href={backHref} />}
      <div className={styles.body}>
        <div className={styles.topBar}>
          <button className={styles.quit} onClick={quit}>
            <ArrowIcon />
            Quit song
          </button>
          {/* Only points and streak up here; the microphone light and line count sit under the lyrics. */}
          <div className={styles.chips}>
            <span className={styles.tile}>
              <b>{stats.score.toLocaleString("en")}</b>
              <span>pts</span>
            </span>
            <span className={styles.tile} title="Full lines in a row">
              <b>{stats.streak}</b>
              <span>line streak</span>
            </span>
          </div>
        </div>

        <div className={styles.center}>
          {status.kind === "connecting" && (
            <div className={styles.status}>Getting the player ready…</div>
          )}

          {status.kind === "ad" && (
            <div className={styles.status}>
              A short ad is playing. Your song starts right after.
            </div>
          )}

          {status.kind === "dropped" && (
            <div className={styles.panel}>
              <h2>Paused: Spotify is playing somewhere else.</h2>
              <p>
                The music moved to another device, or the connection to Spotify dropped. Your place
                in the song is saved.
              </p>
              <button className={styles.panelButton} onClick={resume}>
                Resume here
              </button>
            </div>
          )}

          {status.kind === "playing" && paused && !held && (
            <div className={styles.panel}>
              <h2>Paused.</h2>
              <p>The lyrics are hidden and the app isn&apos;t listening. Press play to continue.</p>
            </div>
          )}

          {lyricsShown && (
            <div className={styles.lyrics} ref={lyricsRef}>
              {currentLine >= 1 ? (
                <div
                  key={currentLine - 1}
                  data-key={currentLine - 1}
                  className={`${styles.line} ${styles.prevLine}`}
                >
                  {renderLine(currentLine - 1)}
                </div>
              ) : (
                <div key="top" data-key="top" className={`${styles.line} ${styles.prevLine}`} />
              )}
              <div
                key={currentLine >= 0 ? currentLine : "intro"}
                data-key={currentLine >= 0 ? currentLine : "intro"}
                className={`${styles.line} ${styles.currentLine} ${styles.enter}`}
              >
                {currentLine >= 0 ? renderLine(currentLine) : "· · ·"}
              </div>
              <div key="next" data-key="next" className={`${styles.line} ${styles.nextLine}`}>
                {currentLine < lines.length - 1 ? "· · ·" : ""}
              </div>
            </div>
          )}

          {status.kind === "blocked" && (
            <div className={styles.panel}>
              <h2>Your browser blocked the sound.</h2>
              <p>Browsers only allow sound after you click something.</p>
              <button className={styles.panelButton} onClick={unblock}>
                Start the music
              </button>
            </div>
          )}

          {status.kind === "error" && (
            <div className={styles.panel}>
              <h2>{errors[status.error].title}</h2>
              <p>{errors[status.error].body}</p>
              <div className={styles.actions}>
                {status.error === "permissions" && (
                  // Plain link: this is a server route, not a page to prefetch.
                  <a href="/api/auth/login" className={styles.panelButton}>
                    Reconnect Spotify
                  </a>
                )}
                {status.error === "start_failed" && (
                  <button className={styles.panelButton} onClick={retry}>
                    Retry
                  </button>
                )}
                <Link href={backHref} className={styles.panelLink}>
                  Back to song
                </Link>
              </div>
            </div>
          )}
        </div>

        {status.kind === "playing" && !hidden && (
          <div className={styles.below}>
            <button
              type="button"
              className={`${styles.mic} ${mic.className}`}
              onClick={listening.state === "failed" ? listening.retry : undefined}
              disabled={listening.state !== "failed"}
            >
              <span className={styles.micDot} aria-hidden="true" />
              {mic.label}
            </button>
            <div className={`${styles.help} ${styles[helpLine.tone]}`}>{helpLine.text}</div>
            <div className={styles.lineNumber}>
              Line {Math.max(0, lineIndex)} of {lines.length}
            </div>
          </div>
        )}
      </div>

      <div className={styles.playerBar}>
        <PlayerBar
          title={track.title}
          artist={track.artist}
          cover={track.cover}
          playing={playing}
          positionSec={positionSec}
          durationSec={track.durationMs / 1000}
          onToggle={togglePause}
          disabled={status.kind !== "playing" || held}
        />
      </div>
    </main>
  );
}

/** Sends a finished sung game to your progress: each sung word heard or not, with its line. */
async function saveSingResult(
  trackId: string,
  track: TrackSummary,
  result: SingGameResult
): Promise<"saved" | "failed" | "expired"> {
  const words: WordResult[] = result.sung.flatMap((s) =>
    s.words.flatMap((answer, i) =>
      s.sing[i]
        ? [
            {
              answer,
              result: s.heardAt[i] !== null ? ("right" as const) : ("revealed" as const),
              wrongTries: 0,
              guess: "",
              line: s.line,
            },
          ]
        : []
    )
  );
  try {
    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: result.id,
        mode: "sing",
        level: result.level,
        song: {
          trackId,
          title: track.title,
          artist: track.artist,
          cover: track.cover,
          durationMs: track.durationMs,
        },
        words,
      }),
    });
    if (res.status === 401) return "expired";
    return res.ok ? "saved" : "failed";
  } catch {
    return "failed";
  }
}

export function SingResults({
  trackId,
  track,
  lines,
  result,
  libraryHref,
  profile,
  onPlayAgain,
  onTryNext,
  onTryTyping,
}: {
  trackId: string;
  track: TrackSummary;
  lines: TimedLine[];
  result: SingGameResult;
  libraryHref: string;
  profile: Profile;
  onPlayAgain: () => void;
  onTryNext: (level: Difficulty) => void;
  onTryTyping: () => void;
}) {
  const router = useRouter();
  const { level, sung, stats } = result;
  const next = nextDifficulty(level);
  const info = DIFFICULTIES[level];

  // Saved as soon as the results open. The server ignores a game it already
  // has, so Retry (or a double send) can't count it twice.
  const [saveAttempt, setSaveAttempt] = useState(0);
  const [saveResult, setSaveResult] = useState<{ attempt: number; failed: boolean } | null>(null);
  useEffect(() => {
    let ignore = false;
    saveSingResult(trackId, track, result).then((outcome) => {
      if (ignore) return;
      if (outcome === "expired") router.push("/?expired=1");
      else setSaveResult({ attempt: saveAttempt, failed: outcome === "failed" });
    });
    return () => {
      ignore = true;
    };
  }, [trackId, track, result, saveAttempt, router]);
  const saveFailed = saveResult?.attempt === saveAttempt && saveResult.failed;

  return (
    <>
      <Header profile={profile} />
      <main className={styles.results}>
        <section className={styles.resultsTop}>
          <p className={styles.eyebrow}>
            Song sung · {track.title} — {track.artist}
          </p>
          <Verdict text={verdict(stats.accuracy)} />
          <p className={styles.summary}>
            You sang {stats.correct} of {stats.total} words in {track.title}.
          </p>
          {result.offMs >= OFF_NOTE_MS && (
            <p className={styles.summary}>
              Listening was off for part of this song, so some lines may count as missed.
            </p>
          )}
          {saveFailed && (
            <div className={styles.saveError}>
              <span>Couldn&apos;t save this game to your progress.</span>
              <button className={styles.saveRetry} onClick={() => setSaveAttempt((n) => n + 1)}>
                Retry
              </button>
            </div>
          )}
          <div className={styles.stats}>
            <ResultTile label="Score" value={stats.score} hint={`${info.points} per word`} />
            <ResultTile
              label="Accuracy"
              value={`${stats.accuracy}%`}
              hint={`${stats.correct} of ${stats.total} words heard`}
            />
            <ResultTile label="Best streak" value={stats.bestStreak} hint="Full lines in a row" />
            <ResultTile
              label="Sing"
              value={info.label}
              hint={SING_DESCRIPTIONS[level].split(".")[0]}
            />
          </div>
          <div className={styles.resultActions}>
            <PlayAgain label="Sing again" onClick={onPlayAgain} />
            {next && (
              <button className={styles.outline} onClick={() => onTryNext(next)}>
                Try {DIFFICULTIES[next].label}
              </button>
            )}
            <button className={styles.outline} onClick={onTryTyping}>
              Try typing
            </button>
            <Link href={libraryHref} className={styles.quietLink}>
              Pick another song
            </Link>
          </div>
        </section>

        <section className={styles.guesses}>
          <h2>Your lines</h2>
          <ol className={styles.sungLines}>
            {sung.map((s) => {
              let k = -1;
              return (
                <li key={s.line}>
                  {tokenize(lines[s.line].text).map((t, wi) => {
                    if (!t.core) return <span key={wi}>{t.raw} </span>;
                    k++;
                    if (!s.sing[k]) return <span key={wi}>{t.raw} </span>;
                    return (
                      <span key={wi}>
                        {t.lead}
                        <LyricBlank
                          answer={t.core}
                          state={s.heardAt[k] !== null ? "correct" : "wrong"}
                        />
                        {t.trail}{" "}
                      </span>
                    );
                  })}
                  <span className={styles.lineCount}>
                    {lineCounts(s).heard} of {lineCounts(s).total}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      </main>
    </>
  );
}
