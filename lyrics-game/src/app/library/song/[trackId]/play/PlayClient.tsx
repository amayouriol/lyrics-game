"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  isMatch,
  nextDifficulty,
  pickBlanks,
  tokenize,
  verdict,
  type Answer,
  type Blank,
  type Difficulty,
  type Stats,
  type TimedLine,
} from "@/lib/game";
import { loadSong, playHref, songHref, type SongResult, type TrackSummary } from "../loadSong";
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

const HELP_DEFAULT = "Type the missing word. It checks as you go. Enter on an empty blank skips it.";

interface GameResult {
  level: Difficulty;
  blanks: Blank[];
  answers: Record<string, Answer>;
  stats: Stats;
}

export function PlayClient({
  trackId,
  from,
  initialLevel,
}: {
  trackId: string;
  from: string | null;
  initialLevel: Difficulty;
}) {
  const router = useRouter();
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<{ key: number; value: SongResult } | null>(null);
  const [level, setLevel] = useState(initialLevel);
  const [round, setRound] = useState(0);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);

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

  const startRound = (nextLevel: Difficulty) => {
    if (nextLevel !== level) {
      setLevel(nextLevel);
      // Keep the URL in step, so a refresh replays at the same level.
      window.history.replaceState(null, "", playHref(trackId, from, nextLevel));
    }
    setGameResult(null);
    setRound((r) => r + 1);
  };

  if (song?.kind === "ready" && song.status === "available") {
    if (gameResult) {
      return (
        <Results
          track={song.track}
          result={gameResult}
          libraryHref={from ? `/library?source=${encodeURIComponent(from)}` : "/library"}
          onPlayAgain={() => startRound(gameResult.level)}
          onTryNext={(next) => startRound(next)}
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
  level,
  backHref,
  onFinished,
}: {
  trackId: string;
  track: TrackSummary;
  lines: TimedLine[];
  level: Difficulty;
  backHref: string;
  onFinished: (result: GameResult) => void;
}) {
  const router = useRouter();
  const blanks = useMemo(() => pickBlanks(lines, level), [lines, level]);
  const blankById = useMemo(() => new Map(blanks.map((b) => [b.id, b])), [blanks]);
  const lineTimesMs = useMemo(() => lines.map((l) => l.timeMs), [lines]);

  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  /** The latest thing you did, shown in the help line until the song moves on a line. */
  const [lastEvent, setLastEvent] = useState<{ line: number; text: string; bad: boolean } | null>(
    null
  );

  const onEnded = useCallback(() => {
    onFinished({ level, blanks, answers, stats: computeStats(blanks, answers, Infinity, level) });
  }, [onFinished, level, blanks, answers]);

  const { status, paused, positionSec, lineIndex, togglePause, resume, unblock, retry, stop } =
    usePlayer({ trackId, durationMs: track.durationMs, lineTimesMs, onEnded });

  const currentLine = lineIndex - 1;
  // Paused by you or by another device: lyrics hidden, no typing.
  const hidden = status.kind === "dropped" || (status.kind === "playing" && paused);
  const activeId = activeBlankId(blanks, answers, currentLine);
  const stats = computeStats(blanks, answers, currentLine, level);

  function onType(blank: Blank, value: string) {
    if (hidden || blank.id !== activeId) return;
    if (isMatch(value, blank.answer)) {
      const next: Record<string, Answer> = { ...answers, [blank.id]: { value, status: "correct" } };
      setAnswers(next);
      const { streak } = computeStats(blanks, next, currentLine, level);
      setLastEvent({
        line: currentLine,
        text: streak >= 3 ? `Got it. ${streak} in a row.` : "Got it.",
        bad: false,
      });
    } else {
      setAnswers({ ...answers, [blank.id]: { value, status: "typing" } });
    }
  }

  function onSubmit(blank: Blank, value: string) {
    if (hidden || blank.id !== activeId) return;
    if (!value.trim()) {
      setAnswers({ ...answers, [blank.id]: { value: "", status: "skipped" } });
      setLastEvent({ line: currentLine, text: `Skipped. It was “${blank.answer}”.`, bad: true });
    } else if (!isMatch(value, blank.answer)) {
      setLastEvent({
        line: currentLine,
        text: "Not it. Keep trying before the line moves on.",
        bad: true,
      });
    }
  }

  function help(): { text: string; tone: "muted" | "good" | "bad" } {
    if (currentLine < 0) return { text: "Get ready. The first line is coming.", tone: "muted" };
    if (lastEvent && lastEvent.line === currentLine) {
      return { text: lastEvent.text, tone: lastEvent.bad ? "bad" : "good" };
    }
    const missed = blanks.filter(
      (b) =>
        b.line === currentLine - 1 &&
        answers[b.id]?.status !== "correct" &&
        answers[b.id]?.status !== "skipped"
    );
    if (missed.length > 0) {
      return { text: `Too slow. It was “${missed[missed.length - 1].answer}”.`, tone: "bad" };
    }
    return { text: HELP_DEFAULT, tone: "muted" };
  }

  function renderLine(li: number) {
    return tokenize(lines[li].text).map((token, wi) => {
      const blank = blankById.get(`${li}-${wi}`);
      if (!blank) return <span key={wi}>{token.raw}</span>;
      const state = blankState(blank, answers[blank.id], currentLine, activeId);
      return (
        <span key={wi} className={styles.word}>
          {token.lead}
          <LyricBlank
            answer={blank.answer}
            value={answers[blank.id]?.value ?? ""}
            state={state === "future" ? "waiting" : state}
            onChange={(v) => onType(blank, v)}
            onSubmit={(v) => onSubmit(blank, v)}
          />
          {token.trail}
        </span>
      );
    });
  }

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
                The music moved to another device, or the connection to Spotify dropped. Your
                place in the song is saved.
              </p>
              <button className="btn btn--lg" onClick={resume}>
                Resume here
              </button>
            </div>
          )}

          {status.kind === "playing" && paused && (
            <div className={styles.panel}>
              <h2>Paused.</h2>
              <p>The lyrics are hidden while the song is paused. Press play to continue.</p>
            </div>
          )}

          {status.kind === "playing" && !hidden && (
            <>
              <div className={styles.prevLine}>{currentLine >= 1 && renderLine(currentLine - 1)}</div>
              <div className={styles.currentLine}>
                {currentLine >= 0 ? renderLine(currentLine) : "· · ·"}
              </div>
              <div className={styles.nextLine}>{currentLine < lines.length - 1 ? "· · ·" : ""}</div>
            </>
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
          disabled={status.kind !== "playing"}
        />
      </div>
    </main>
  );
}

function Results({
  track,
  result,
  libraryHref,
  onPlayAgain,
  onTryNext,
}: {
  track: TrackSummary;
  result: GameResult;
  libraryHref: string;
  onPlayAgain: () => void;
  onTryNext: (level: Difficulty) => void;
}) {
  const { level, blanks, answers, stats } = result;
  const next = nextDifficulty(level);
  const info = DIFFICULTIES[level];

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
          <div className={styles.stats}>
            <StatBlock label="Score" value={stats.score} tone="primary" hint={`${info.points} per word`} />
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
