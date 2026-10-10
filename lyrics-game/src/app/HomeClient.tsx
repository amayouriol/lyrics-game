"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatBlock } from "@/components/StatBlock";
import { BookmarkIcon, HeartIcon, KeyboardIcon, MicIcon } from "@/components/icons";
import { DIFFICULTIES, type Difficulty } from "@/lib/game";
import type { Game, MissedWord, OverallStats } from "@/lib/progress";
import { playHref, songHref } from "./library/song/[trackId]/loadSong";
import styles from "./home.module.css";

type BriefGame = Omit<Game, "words">;

interface SavedSection {
  count: number;
  songs: { id: string; title: string; artist: string; cover: string | null; level: Difficulty }[];
}

interface Progress {
  /** Typed games, and sung ones once there are any (Phase 8). */
  overall: { typed: OverallStats; sung: OverallStats | null };
  recent: BriefGame[];
  best: BriefGame[];
  missed: MissedWord[];
  unavailable: string[];
  saved: { favorites: SavedSection; later: SavedSection };
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

export function HomeClient() {
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

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <h1>{firstTime ? "Welcome." : "Ready for another song?"}</h1>
        <p>
          {firstTime
            ? "Play your first song to start tracking your progress."
            : "Pick anything from your library and finish the lines."}
        </p>
        <Link href="/library" className="btn btn--lg">
          Pick a song
        </Link>
      </section>

      {!state && <p className={styles.hint}>Loading your progress…</p>}

      {state?.status === "error" && (
        <div className={styles.errorPanel}>
          <h2>Your progress didn&apos;t load.</h2>
          <p>Your games are still saved. It&apos;s probably a blip.</p>
          <button className="btn btn--secondary" onClick={() => setReloadKey((k) => k + 1)}>
            Retry
          </button>
        </div>
      )}

      {state?.status === "ready" && firstTime && <SavedSections saved={state.progress.saved} />}

      {state?.status === "ready" && !firstTime && (
        <Sections progress={state.progress} now={state.loadedAt} />
      )}
    </main>
  );
}

function Sections({ progress, now }: { progress: Progress; now: number }) {
  const { recent, best, missed, unavailable } = progress;
  const { typed: overall, sung } = progress.overall;
  const gone = new Set(unavailable);
  // Marks in Best songs only matter once both typed and sung games are listed.
  const hasBoth = best.some((g) => g.mode === "sing") && best.some((g) => g.mode !== "sing");

  return (
    <>
      <section className={styles.stats}>
        <StatBlock
          label={sung ? "Songs typed" : "Songs played"}
          value={overall.songsPlayed}
          tone="primary"
          hint="Finished songs"
        />
        <StatBlock
          label="Words guessed"
          value={overall.wordsGuessed}
          tone="secondary"
          hint="Right answers in total"
        />
        <StatBlock
          label="Accuracy"
          value={`${overall.accuracy}%`}
          tone="tertiary"
          hint={sung ? "Across every typed game" : "Across every game"}
        />
        <StatBlock
          label="Best streak"
          value={overall.bestStreak}
          tone="quaternary"
          hint="In a row, no misses"
        />
        {sung && (
          <StatBlock
            label="Songs sung"
            value={sung.songsPlayed}
            tone="secondary"
            hint={`${sung.accuracy}% of words heard`}
          />
        )}
      </section>

      <SavedSections saved={progress.saved} />

      <div className={styles.columns}>
        <section className={styles.section}>
          <h2>Recently played</h2>
          <div className={styles.rows}>
            {recent.map((game) => (
              <div key={game.id} className={styles.row}>
                <SongLink game={game}>
                  {game.mode === "sing" && <ModeMark mode="sing" />}
                  {DIFFICULTIES[game.level].label} · {game.score} pts · {game.accuracy}% ·{" "}
                  {timeAgo(game.playedAt, now)}
                </SongLink>
                {gone.has(game.song.trackId) ? (
                  <span className={styles.gone}>No longer available.</span>
                ) : (
                  <Link
                    href={playHref(game.song.trackId, null, game.level, game.mode ?? "type")}
                    className="btn btn--secondary btn--sm"
                  >
                    Play again
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2>Best songs</h2>
          <div className={styles.rows}>
            {best.map((game) => (
              <div key={game.id} className={styles.row}>
                <SongLink game={game}>
                  {hasBoth && <ModeMark mode={game.mode ?? "type"} />}
                  {game.mode === "sing" ? "Sung" : "Set"} on {DIFFICULTIES[game.level].label}
                </SongLink>
                <span className={styles.bigNumber}>{game.accuracy}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className={styles.section}>
        <h2>Words you keep missing</h2>
        {missed.length === 0 ? (
          <p className={styles.hint}>No repeat misses yet. Nice.</p>
        ) : (
          <div className={styles.missed}>
            {missed.map((w) => (
              <div key={w.word} className={styles.missedWord}>
                <span className={styles.word}>{w.word}</span>
                <span className={styles.missedCount}>
                  missed {w.misses} of {w.seen} times
                </span>
                <span className={styles.missedSongs}>{w.songs.join(", ")}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
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
      <div
        className={styles.cover}
        style={game.song.cover ? { backgroundImage: `url(${game.song.cover})` } : undefined}
      />
      <div className={styles.songInfo}>
        <span className={styles.title}>{game.song.title}</span>
        <span className={styles.artist}>{game.song.artist}</span>
        <span className={styles.meta}>{children}</span>
      </div>
    </Link>
  );
}

const SAVED: { list: "later" | "favorites"; title: string }[] = [
  { list: "later", title: "Play later" },
  { list: "favorites", title: "Favorites" },
];

/** Play later and Favorites, each hidden when empty. Play starts at the level you last played. */
function SavedSections({ saved }: { saved: Progress["saved"] }) {
  const shown = SAVED.filter(({ list }) => saved[list].count > 0);
  if (shown.length === 0) return null;
  return (
    <div className={styles.columns}>
      {shown.map(({ list, title }) => (
        <section key={list} className={styles.section}>
          <div className={styles.savedHead}>
            <h2>
              {list === "favorites" ? <HeartIcon filled /> : <BookmarkIcon filled />}
              {title}
            </h2>
            <Link href={`/library?source=${list}`} className={styles.seeAll}>
              See all {saved[list].count}
            </Link>
          </div>
          <div className={styles.rows}>
            {saved[list].songs.map((song) => (
              <div key={song.id} className={styles.row}>
                <Link href={songHref(song.id, list)} className={styles.song}>
                  <div
                    className={styles.cover}
                    style={song.cover ? { backgroundImage: `url(${song.cover})` } : undefined}
                  />
                  <div className={styles.songInfo}>
                    <span className={styles.title}>{song.title}</span>
                    <span className={styles.artist}>{song.artist}</span>
                  </div>
                </Link>
                <Link
                  href={playHref(song.id, list, song.level)}
                  className="btn btn--secondary btn--sm"
                  title={`Play on ${DIFFICULTIES[song.level].label}`}
                >
                  Play
                </Link>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
