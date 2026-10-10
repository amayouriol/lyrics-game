"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { LyricBlank } from "@/components/LyricBlank";
import { PlayerBar } from "@/components/PlayerBar";
import { StatBlock } from "@/components/StatBlock";
import {
  activeBlankId,
  blankState,
  computeStats,
  DIFFICULTIES,
  isFullLengthMiss,
  isMatch,
  MAX_TRIES,
  nextDifficulty,
  pointsFor,
  tokenize,
  verdict,
  type Answer,
  type Blank,
  type Difficulty,
  type Stats,
  type TimedLine,
} from "@/lib/game";
import type { WordResult } from "@/lib/progress";
import { loadSong, playHref, songHref, type SongResult, type TrackSummary } from "../loadSong";
import { useSingLanguage, type PlayMode } from "../singPrefs";
import { useLineGlide, useSweep } from "./lyricsMotion";
import { SingResults, SingScreen, type SingGameResult } from "./SingScreen";
import { LISTEN_LANG } from "./speech";
import { usePlayer, type PlayerError } from "./usePlayer";
import styles from "./play.module.css";

const ERRORS: Record<PlayerError, { title: string; body: string }> = {
  permissions: {
    title: "Reconnect Spotify to allow playback.",
    body: "Your current login doesn't include permission to play music in this browser.",
  },
  premium: {
    title: "Spotify Premium is required to play songs here.",
    body: "Spotify only lets Premium accounts play full songs in the browser.",
  },
  unsupported: {
    title: "This browser can't play Spotify songs.",
    body: "It's missing the copy protection Spotify requires. Try Chrome, Edge or Firefox.",
  },
  start_failed: {
    title: "The player didn't start.",
    body: "Spotify's player didn't respond. It's probably a blip.",
  },
};

const HELP_DEFAULT =
  "Type the missing word. A wrong word costs a try (3 per word). Enter on an empty blank skips it.";
const HELP_WAITING =
  "The song waits for you. Type the word, or press Enter on an empty blank to skip.";
/** On the last line, the song waits this close to its end. */
const LAST_LINE_HOLD_MS = 1_500;
/** How long the song waits for an open word before it counts as missed. */
const WAIT_LIMIT_MS = 15_000;
/** The countdown turns red for its last seconds. */
const WAIT_WARNING_SEC = 5;
interface GameResult {
  /** Made when the round starts, so the game is saved once however often it's sent. */
  id: string;
  mode: "type";
  level: Difficulty;
  blanks: Blank[];
  answers: Record<string, Answer>;
  stats: Stats;
}

export function PlayClient({
  trackId,
  from,
  initialLevel,
  initialMode,
}: {
  trackId: string;
  from: string | null;
  initialLevel: Difficulty;
  initialMode: PlayMode;
}) {
  const router = useRouter();
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<{ key: number; value: SongResult } | null>(null);
  const [level, setLevel] = useState(initialLevel);
  const [round, setRound] = useState(0);
  const [mode, setMode] = useState(initialMode);
  const [gameResult, setGameResult] = useState<GameResult | SingGameResult | null>(null);

  useEffect(() => {
    let ignore = false;
    loadSong(trackId).then((value) => {
      if (ignore) return;
      if (value === "expired") {
        router.push("/?expired=1");
        return;
      }
      setResult({ key: reloadKey, value });
    });
    return () => {
      ignore = true;
    };
  }, [trackId, reloadKey, router]);

  const song = result && result.key === reloadKey ? result.value : null;
  const backHref = songHref(trackId, from);
  const [language] = useSingLanguage(trackId, song?.kind === "ready" ? song.language : null);
  const libraryHref = from ? `/library?source=${encodeURIComponent(from)}` : "/library";

  const startRound = (nextLevel: Difficulty, nextMode: PlayMode = mode) => {
    if (nextLevel !== level || nextMode !== mode) {
      setLevel(nextLevel);
      setMode(nextMode);
      // Keep the URL in step, so a refresh replays at the same level and mode.
      window.history.replaceState(null, "", playHref(trackId, from, nextLevel, nextMode));
    }
    setGameResult(null);
    setRound((r) => r + 1);
  };

  if (song?.kind === "ready" && song.status === "available") {
    if (gameResult?.mode === "sing") {
      return (
        <SingResults
          trackId={trackId}
          track={song.track}
          lines={song.lines}
          result={gameResult}
          libraryHref={libraryHref}
          onPlayAgain={() => startRound(gameResult.level)}
          onTryNext={(next) => startRound(next)}
          onTryTyping={() => startRound(gameResult.level, "type")}
        />
      );
    }
    if (gameResult) {
      return (
        <Results
          trackId={trackId}
          track={song.track}
          result={gameResult}
          libraryHref={libraryHref}
          onPlayAgain={() => startRound(gameResult.level)}
          onTryNext={(next) => startRound(next)}
        />
      );
    }
    if (mode === "sing") {
      return (
        <SingScreen
          // A new key per round resets the game; the page's Spotify player is reused.
          key={`sing-${level}-${round}`}
          trackId={trackId}
          track={song.track}
          lines={song.lines}
          level={level}
          listenLang={LISTEN_LANG[language ?? "en"]}
          backHref={backHref}
          errors={ERRORS}
          onFinished={setGameResult}
        />
      );
    }
    return (
      <PlayScreen
        // A new key per round resets the game; the page's Spotify player is reused.
        key={`${level}-${round}`}
        trackId={trackId}
        track={song.track}
        lines={song.lines}
        blanks={song.blanks[level]}
        level={level}
        backHref={backHref}
        onFinished={setGameResult}
      />
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.body}>
        <div className={styles.topBar}>
          <Link href={backHref} className="btn btn--ghost btn--sm">
            Back to song
          </Link>
        </div>
        <div className={styles.center}>
          {!song && <div className={styles.status}>Getting the player ready…</div>}
          {(song?.kind === "not_found" ||
            (song?.kind === "ready" && song.status === "unavailable")) && (
            <div className={styles.status}>Lyrics not available for this song.</div>
          )}
          {(song?.kind === "lyrics_error" || song?.kind === "error") && (
            <div className={styles.panel}>
              <h2>
                {song.kind === "lyrics_error"
                  ? "The lyrics service is having a moment."
                  : "Spotify didn't answer."}
              </h2>
              <p>We couldn&apos;t load this song. It&apos;s probably a blip.</p>
              <button className="btn btn--secondary" onClick={() => setReloadKey((k) => k + 1)}>
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function PlayScreen({
  trackId,
  track,
  lines,
  blanks,
  level,
  backHref,
  onFinished,
}: {
  trackId: string;
  track: TrackSummary;
  lines: TimedLine[];
  blanks: Blank[];
  level: Difficulty;
  backHref: string;
  onFinished: (result: GameResult) => void;
}) {
  const router = useRouter();
  const blankById = useMemo(() => new Map(blanks.map((b) => [b.id, b])), [blanks]);
  const lineTimesMs = useMemo(() => lines.map((l) => l.timeMs), [lines]);

  const [gameId] = useState(() => crypto.randomUUID());
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  /** The latest thing you did, shown in the help line until the song moves on a line. */
  const [lastEvent, setLastEvent] = useState<{ line: number; text: string; bad: boolean } | null>(
    null
  );

  const onEnded = useCallback(() => {
    onFinished({
      id: gameId,
      mode: "type",
      level,
      blanks,
      answers,
      stats: computeStats(blanks, answers, Infinity, level),
    });
  }, [onFinished, gameId, level, blanks, answers]);

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
  } = usePlayer({ trackId, durationMs: track.durationMs, lineTimesMs, onEnded });

  const currentLine = lineIndex - 1;
  const activeId = activeBlankId(blanks, answers, currentLine);
  const stats = computeStats(blanks, answers, currentLine, level);

  // While the current line has an unanswered word, the song waits just
  // before the next line (or near the end, on the last line).
  const holdBeforeMs =
    activeId === null || currentLine < 0
      ? null
      : currentLine + 1 < lines.length
        ? lines[currentLine + 1].timeMs
        : track.durationMs - LAST_LINE_HOLD_MS;
  useEffect(() => {
    setHoldBeforeMs(holdBeforeMs);
  }, [holdBeforeMs, setHoldBeforeMs]);

  // The wait has a time limit. Worked out from the clock, not by counting
  // ticks, so it stays right while the tab is in the background (browsers
  // slow timers there). A drop clears the wait, so a new one after Resume
  // starts a fresh countdown.
  const [now, setNow] = useState(0);
  const timeUpRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (heldSince === null) return;
    const id = setInterval(() => {
      const t = performance.now();
      setNow(t);
      if (t - heldSince >= WAIT_LIMIT_MS) {
        clearInterval(id);
        timeUpRef.current();
      }
    }, 250);
    return () => clearInterval(id);
  }, [heldSince]);
  const secondsLeft =
    heldSince === null
      ? null
      : Math.max(0, Math.ceil((WAIT_LIMIT_MS - Math.max(0, now - heldSince)) / 1000));

  // Paused by you or by another device: lyrics hidden, no typing. Waiting
  // for your answer is different: the lyrics stay up so you can type.
  const hidden = status.kind === "dropped" || (status.kind === "playing" && paused && !held);

  function onType(blank: Blank, value: string) {
    if (hidden || blank.id !== activeId) return;
    const wrongTries = answers[blank.id]?.wrongTries ?? 0;
    if (isMatch(value, blank.answer)) {
      const next: Record<string, Answer> = {
        ...answers,
        [blank.id]: { value, status: "correct", wrongTries },
      };
      setAnswers(next);
      const { streak } = computeStats(blanks, next, currentLine, level);
      setLastEvent({
        line: currentLine,
        text:
          wrongTries > 0
            ? `Got it on try ${wrongTries + 1}. +${pointsFor(level, wrongTries)}`
            : streak >= 3
              ? `Got it. ${streak} in a row.`
              : "Got it.",
        bad: false,
      });
    } else if (isFullLengthMiss(value, blank.answer)) {
      wrongTry(blank, value);
    } else {
      setAnswers({ ...answers, [blank.id]: { value, status: "typing", wrongTries } });
    }
  }

  function onSubmit(blank: Blank, value: string) {
    if (hidden || blank.id !== activeId) return;
    const wrongTries = answers[blank.id]?.wrongTries ?? 0;
    if (!value.trim()) {
      setAnswers({ ...answers, [blank.id]: { value: "", status: "skipped", wrongTries } });
      setLastEvent({ line: currentLine, text: `Skipped. It was “${blank.answer}”.`, bad: true });
    } else if (!isMatch(value, blank.answer)) {
      wrongTry(blank, value);
    }
  }

  /** A wrong guess: costs a try; after the last one the word is missed and the song moves on. */
  function wrongTry(blank: Blank, value: string) {
    const wrongTries = (answers[blank.id]?.wrongTries ?? 0) + 1;
    if (wrongTries >= MAX_TRIES) {
      setAnswers({ ...answers, [blank.id]: { value, status: "missed", wrongTries } });
      setLastEvent({
        line: currentLine,
        text: `Out of tries. It was “${blank.answer}”.`,
        bad: true,
      });
      return;
    }
    // Clear the box for the next try.
    setAnswers({ ...answers, [blank.id]: { value: "", status: "typing", wrongTries } });
    const left = MAX_TRIES - wrongTries;
    setLastEvent({
      line: currentLine,
      text: `Not “${value.trim()}”. ${left} ${left === 1 ? "try" : "tries"} left.`,
      bad: true,
    });
  }

  /** Out of time: every open word on the line is missed and the song moves on. */
  function timeUp() {
    const open = blanks.filter(
      (b) =>
        b.line === currentLine &&
        answers[b.id]?.status !== "correct" &&
        answers[b.id]?.status !== "skipped" &&
        answers[b.id]?.status !== "missed"
    );
    if (open.length === 0) return;
    const next = { ...answers };
    for (const b of open) {
      next[b.id] = {
        value: answers[b.id]?.value ?? "",
        status: "missed",
        wrongTries: answers[b.id]?.wrongTries ?? 0,
        timedOut: true,
      };
    }
    setAnswers(next);
    const last = open[open.length - 1];
    setLastEvent({ line: currentLine, text: `Time's up. It was “${last.answer}”.`, bad: true });
  }
  useEffect(() => {
    timeUpRef.current = timeUp;
  });

  function help(): { text: string; tone: "muted" | "good" | "bad" } {
    if (currentLine < 0) return { text: "Get ready. The first line is coming.", tone: "muted" };
    if (lastEvent && lastEvent.line === currentLine) {
      return { text: lastEvent.text, tone: lastEvent.bad ? "bad" : "good" };
    }
    if (held) return { text: HELP_WAITING, tone: "muted" };
    // The song moves on right after a miss, so its message carries over
    // to the next line instead of vanishing at once.
    const missed = blanks.filter(
      (b) =>
        b.line === currentLine - 1 &&
        answers[b.id]?.status !== "correct" &&
        answers[b.id]?.status !== "skipped"
    );
    if (missed.length > 0) {
      const last = missed[missed.length - 1];
      const answer = answers[last.id];
      const lead =
        answer?.status !== "missed"
          ? "Too slow."
          : answer.timedOut
            ? "Time's up."
            : "Out of tries.";
      return { text: `${lead} It was “${last.answer}”.`, tone: "bad" };
    }
    return { text: HELP_DEFAULT, tone: "muted" };
  }

  function renderLine(li: number) {
    const tokens = tokenize(lines[li].text);
    // Each word's place in the line (0–1, by characters), where the sweep lights it.
    const totalChars = tokens.reduce((n, t) => n + t.raw.length + 1, 0);
    let charsBefore = 0;
    return tokens.map((token, wi) => {
      const at = (charsBefore / totalChars).toFixed(3);
      charsBefore += token.raw.length + 1;
      const blank = blankById.get(`${li}-${wi}`);
      if (!blank)
        return (
          <span key={wi} data-at={at}>
            {token.raw}
          </span>
        );
      const state = blankState(blank, answers[blank.id], currentLine, activeId);
      const wrongTries = answers[blank.id]?.wrongTries ?? 0;
      return (
        <span key={wi} className={styles.word} data-at={at}>
          {token.lead}
          <LyricBlank
            // A new key per wrong try remounts the box, replaying its shake.
            key={`${blank.id}-${wrongTries}`}
            answer={blank.answer}
            value={answers[blank.id]?.value ?? ""}
            state={state === "future" ? "waiting" : state}
            wrongTries={wrongTries}
            onChange={(v) => onType(blank, v)}
            onSubmit={(v) => onSubmit(blank, v)}
          />
          {token.trail}
          {state === "active" && secondsLeft !== null && (
            <span
              className={`${styles.countdown} ${secondsLeft <= WAIT_WARNING_SEC ? styles.countdownLow : ""}`}
              role="timer"
              aria-label={`${secondsLeft} seconds left`}
            >
              {secondsLeft}
            </span>
          )}
        </span>
      );
    });
  }

  const lyricsRef = useRef<HTMLDivElement>(null);
  useLineGlide(lyricsRef, currentLine);

  // While the song waits for an answer, the whole line is lit (the song
  // stops a little before the next line, which would leave the last word dim).
  const lyricsShown = status.kind === "playing" && !hidden;
  useSweep({
    lyricsRef,
    shown: lyricsShown,
    full: held,
    currentLine,
    lines,
    lastLineEndMs: track.durationMs - LAST_LINE_HOLD_MS,
    getPositionMs,
  });

  async function quit() {
    await stop();
    router.push(backHref);
  }

  const helpLine = help();

  return (
    <main className={styles.main}>
      <div className={styles.body}>
        <div className={styles.topBar}>
          <button className="btn btn--ghost btn--sm" onClick={quit}>
            Quit song
          </button>
          <div className={styles.chips}>
            <span className="chip chip--tertiary chip--sm">{DIFFICULTIES[level].label}</span>
            <span className="chip chip--grey chip--sm">
              Line {Math.max(0, lineIndex)} of {lines.length}
            </span>
            <span className="chip chip--primary chip--sm">{stats.score} pts</span>
            <span className="chip chip--quaternary chip--sm">Streak {stats.streak}</span>
          </div>
        </div>

        <div className={styles.center}>
          {status.kind === "connecting" && (
            <div className={styles.status}>Getting the player ready…</div>
          )}

          {status.kind === "dropped" && (
            <div className={styles.panel}>
              <h2>Paused: Spotify is playing somewhere else.</h2>
              <p>
                The music moved to another device, or the connection to Spotify dropped. Your place
                in the song is saved.
              </p>
              <button className="btn btn--lg" onClick={resume}>
                Resume here
              </button>
            </div>
          )}

          {status.kind === "playing" && paused && !held && (
            <div className={styles.panel}>
              <h2>Paused.</h2>
              <p>The lyrics are hidden while the song is paused. Press play to continue.</p>
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
              <button className="btn btn--lg" onClick={unblock}>
                Start the music
              </button>
            </div>
          )}

          {status.kind === "error" && (
            <div className={styles.panel}>
              <h2>{ERRORS[status.error].title}</h2>
              <p>{ERRORS[status.error].body}</p>
              <div className={styles.actions}>
                {status.error === "permissions" && (
                  // Plain link: this is a server route, not a page to prefetch.
                  <a href="/api/auth/login" className="btn">
                    Reconnect Spotify
                  </a>
                )}
                {status.error === "start_failed" && (
                  <button className="btn" onClick={retry}>
                    Retry
                  </button>
                )}
                <Link href={backHref} className="btn btn--ghost">
                  Back to song
                </Link>
              </div>
            </div>
          )}
        </div>

        {status.kind === "playing" && !hidden && (
          <div className={`${styles.help} ${styles[helpLine.tone]}`}>{helpLine.text}</div>
        )}
      </div>

      <div className={styles.playerBar}>
        <PlayerBar
          title={track.title}
          artist={track.artist}
          cover={track.cover}
          playing={status.kind === "playing" && !paused}
          positionSec={positionSec}
          durationSec={track.durationMs / 1000}
          onToggle={togglePause}
          disabled={status.kind !== "playing" || held}
        />
      </div>
    </main>
  );
}

/** Sends a finished game to your progress. */
async function saveGameResult(
  trackId: string,
  track: TrackSummary,
  result: GameResult
): Promise<"saved" | "failed" | "expired"> {
  const words: WordResult[] = result.blanks.map((b) => {
    const state = blankState(b, result.answers[b.id], Infinity, null);
    return {
      answer: b.answer,
      result: state === "correct" ? "right" : state === "wrong" ? "wrong" : "revealed",
      wrongTries: result.answers[b.id]?.wrongTries ?? 0,
      guess: result.answers[b.id]?.value ?? "",
    };
  });
  try {
    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: result.id,
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

function Results({
  trackId,
  track,
  result,
  libraryHref,
  onPlayAgain,
  onTryNext,
}: {
  trackId: string;
  track: TrackSummary;
  result: GameResult;
  libraryHref: string;
  onPlayAgain: () => void;
  onTryNext: (level: Difficulty) => void;
}) {
  const router = useRouter();
  const { level, blanks, answers, stats } = result;
  const next = nextDifficulty(level);
  const info = DIFFICULTIES[level];

  // Saved as soon as the results open. The server ignores a game it already
  // has, so Retry (or a double send) can't count it twice.
  const [saveAttempt, setSaveAttempt] = useState(0);
  const [saveResult, setSaveResult] = useState<{ attempt: number; failed: boolean } | null>(null);
  useEffect(() => {
    let ignore = false;
    saveGameResult(trackId, track, result).then((outcome) => {
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
      <Header />
      <main className={styles.results}>
        <section className={styles.resultsTop}>
          <span className="chip chip--primary chip--sm">
            {track.title} — {track.artist}
          </span>
          <h1 className={styles.verdict}>{verdict(stats.accuracy)}</h1>
          <p className={styles.summary}>
            You got {stats.correct} of {stats.total} words in {track.title}.
          </p>
          {saveFailed && (
            <div className={styles.saveError}>
              <span>Couldn&apos;t save this game to your progress.</span>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => setSaveAttempt((n) => n + 1)}
              >
                Retry
              </button>
            </div>
          )}
          <div className={styles.stats}>
            <StatBlock
              label="Score"
              value={stats.score}
              tone="primary"
              hint={`Up to ${info.points} per word`}
            />
            <StatBlock
              label="Accuracy"
              value={`${stats.accuracy}%`}
              tone="secondary"
              hint={`${stats.correct} of ${stats.total} words`}
            />
            <StatBlock
              label="Best streak"
              value={stats.bestStreak}
              tone="quaternary"
              hint="In a row, no misses"
            />
            <StatBlock
              label="Difficulty"
              value={info.label}
              tone="tertiary"
              hint={info.description.split(".")[0]}
            />
          </div>
          <div className={styles.actions}>
            <button className="btn btn--lg" onClick={onPlayAgain}>
              Play again
            </button>
            {next && (
              <button className="btn btn--lg btn--secondary" onClick={() => onTryNext(next)}>
                Try {DIFFICULTIES[next].label}
              </button>
            )}
            <Link href={libraryHref} className="btn btn--lg btn--ghost">
              Pick another song
            </Link>
          </div>
        </section>

        <section className={styles.guesses}>
          <h2>Your guesses</h2>
          <div className={styles.receipts}>
            {blanks.map((b) => {
              const state = blankState(b, answers[b.id], Infinity, null);
              return (
                <LyricBlank
                  key={b.id}
                  answer={b.answer}
                  value={answers[b.id]?.value ?? ""}
                  state={state === "correct" || state === "wrong" ? state : "revealed"}
                />
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
