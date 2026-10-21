"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowIcon, MicIcon } from "@/components/icons";
import {
  DIFFICULTIES,
  MAX_TRIES,
  SPACING_LINES,
  WAIT_LIMIT_MS,
  WAIT_WARNING_SEC,
  type Difficulty,
} from "@/lib/game";
import { MISSED_WORD_MIN, STREAK_ACCURACY } from "@/lib/progress";
import { SING_GRACE_MS, SING_WAIT_MS } from "@/lib/sing";
import styles from "./how.module.css";

// Every number on this page comes from the game's own rules, so it can't
// drift from how the game plays (Phase 9 spec, "How to play text").
const typeWait = WAIT_LIMIT_MS / 1000;
const singWait = SING_WAIT_MS / 1000;
const grace = SING_GRACE_MS / 1000;

const TYPE_LEVELS: Record<Difficulty, string> = {
  easy: "One word on two lines out of three",
  medium: "Two words on every line",
  hard: "Three or four words on every line",
};

const SING_LEVELS: Record<Difficulty, string> = {
  easy: `One line in three · waits up to ${singWait} s`,
  medium: `Every other line · waits up to ${singWait} s`,
  hard: "Every line · doesn't wait",
};

type Mode = "type" | "sing";

export function HowToPlay({ web }: { web: boolean }) {
  const [mode, setMode] = useState<Mode>("type");

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.heading}>
          <Link href={web ? "/home" : "/"} className={styles.back}>
            <ArrowIcon />
            Back home
          </Link>
          <h1>
            How to
            <br />
            <em>play.</em>
          </h1>
        </div>
        <div className={styles.intro}>
          <strong>Know the song. Fill the gaps.</strong>
          <p>
            {web ? "Add a song from YouTube" : "Pick a song from your Spotify library"}. It plays with
            the lyrics on screen while some words or lines disappear. Complete them as the song
            goes.
          </p>
        </div>
      </section>

      <section className={styles.steps}>
        {[
          [
            "01",
            "Pick a song",
            web ? "Search YouTube, or paste a link or playlist." : "Choose any playable song from your library.",
          ],
          ["02", "Choose your game", "Type or Sing, then a level."],
          ["03", "Finish the lyrics", "Fill in the hidden words as the song plays."],
        ].map(([number, title, detail]) => (
          <article className={styles.step} key={number}>
            <span>{number}</span>
            <div>
              <strong>{title}</strong>
              <p>{detail}</p>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.good}>
        <div className={styles.sectionTitle}>
          <p>Before you start</p>
          <h2>Good to know</h2>
        </div>
        <div className={styles.goodList}>
          {(web
            ? [
                "Songs play in YouTube's own player, so a short ad can play first. Use Chrome, Edge or Firefox.",
                "Pausing hides the lyrics until you press play again.",
                "Wrong video? Choose another one from the song's page.",
              ]
            : [
                "Spotify Premium is required. Play in Chrome, Edge or Firefox.",
                "Pausing hides the lyrics until you press play again.",
                "If Spotify starts playing on another device, the game pauses here.",
              ]
          ).map((text, i) => (
            <div key={text}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.modes}>
        <div className={styles.modesHeading}>
          <div className={styles.sectionTitle}>
            <p>Choose your mode</p>
            <h2>Two ways to play</h2>
          </div>
          <div className={styles.switch} role="group" aria-label="Game mode">
            <button
              type="button"
              className={mode === "type" ? styles.switchOn : ""}
              aria-pressed={mode === "type"}
              onClick={() => setMode("type")}
            >
              Type
            </button>
            <button
              type="button"
              className={mode === "sing" ? styles.switchOn : ""}
              aria-pressed={mode === "sing"}
              onClick={() => setMode("sing")}
            >
              <MicIcon />
              Sing
            </button>
          </div>
        </div>

        {mode === "type" ? <TypeGuide /> : <SingGuide />}
      </section>

      <section className={styles.score}>
        <div className={styles.sectionTitle}>
          <p>After every song</p>
          <h2>Understand your score</h2>
        </div>
        <div className={styles.scoreGrid}>
          <article>
            <span>Score</span>
            <strong>Total points</strong>
            <p>
              {mode === "type"
                ? "The points for every word you got, added up over the whole song."
                : "The points for every word heard, added up over the whole song."}
            </p>
          </article>
          <article>
            <span>Accuracy</span>
            <strong>{mode === "type" ? "Words you got" : "Words heard"}</strong>
            <p>
              {mode === "type"
                ? "The share of hidden words you got right."
                : "The share of hidden words the game heard."}
            </p>
          </article>
          <article>
            <span>Best streak</span>
            <strong>{mode === "type" ? "First-try words" : "Full lines"}</strong>
            <p>
              {mode === "type"
                ? "The most words in a row right on the first try."
                : "The most full lines in a row, every word heard."}
            </p>
          </article>
        </div>
      </section>

      <section className={styles.progress}>
        <div className={styles.sectionTitle}>
          <p>Your progress</p>
          <h2>Finish the song to save it.</h2>
        </div>
        <div className={styles.progressCopy}>
          <p>
            Finished songs show in Recently played, Top performances and your totals. Songs you
            leave before the end aren&apos;t saved.
          </p>
          <p>
            <strong>Current streak</strong> counts songs in a row at {STREAK_ACCURACY}% or more.
          </p>
          <p>
            <strong>Words that keep dropping</strong> lists words you&apos;ve missed at least{" "}
            {MISSED_WORD_MIN} times in Type mode. Sing mode misses aren&apos;t counted.
          </p>
        </div>
      </section>
    </main>
  );
}

function Levels({ mode }: { mode: Mode }) {
  const describe = mode === "type" ? TYPE_LEVELS : SING_LEVELS;
  return (
    <div className={styles.levels}>
      <div className={styles.levelsTitle}>
        <span>Levels</span>
        <small>{mode === "type" ? "Points per word" : "Hidden lines · points per word"}</small>
      </div>
      {(Object.keys(DIFFICULTIES) as Difficulty[]).map((level) => (
        <div className={styles.level} key={level}>
          <strong>{DIFFICULTIES[level].label}</strong>
          <span>{describe[level]}</span>
          <b>{DIFFICULTIES[level].points}</b>
        </div>
      ))}
    </div>
  );
}

function TypeGuide() {
  return (
    <div className={styles.modeContent}>
      <div className={styles.summary}>
        <span>Type mode</span>
        <h3>Type the hidden words as they&apos;re sung.</h3>
        <p>
          You get {MAX_TRIES} tries for every word. Right on the first try earns the most points.
        </p>
      </div>

      <Levels mode="type" />

      <div className={styles.rules}>
        <article className={`${styles.rule} ${styles.featured}`}>
          <span>{MAX_TRIES} tries</span>
          <strong>Full → half → quarter</strong>
          <p>
            Each wrong try halves that word&apos;s points. After {MAX_TRIES} wrong tries, the
            answer is shown and the word counts as missed.
          </p>
          <small>A wrong word as long as the answer counts as a try right away, no Enter needed.</small>
        </article>
        <article className={styles.rule}>
          <span>Need to skip?</span>
          <strong>Press Enter on an empty box.</strong>
          <p>The answer is shown and the word counts as missed.</p>
        </article>
        <article className={styles.rule}>
          <span>The song waits</span>
          <strong>Up to {typeWait} seconds.</strong>
          <p>
            If a line ends before you finish its word, the song pauses. The last {WAIT_WARNING_SEC}{" "}
            seconds turn red. If time runs out, the word counts as missed.
          </p>
        </article>
        <article className={`${styles.rule} ${styles.wide}`}>
          <span>What counts as right</span>
          <strong>Spelling matters. Capitals and accents don&apos;t.</strong>
          <p>
            Capitals, accents and apostrophes are ignored: “corazon” counts for “corazón” and
            “dont” for “don&apos;t”.
          </p>
        </article>
        <article className={`${styles.rule} ${styles.wide}`}>
          <span>Which words disappear?</span>
          <strong>Only real words.</strong>
          <p>
            Everyday words like “that”, “with”, “para” and “pero”, and sounds like “whoa” or
            “okay”, stay visible. The same word isn&apos;t hidden again for {SPACING_LINES} lines.
          </p>
        </article>
      </div>
    </div>
  );
}

function SingGuide() {
  return (
    <div className={styles.modeContent}>
      <div className={`${styles.summary} ${styles.summarySing}`}>
        <span>Sing mode</span>
        <h3>Sing the hidden lines out loud.</h3>
        <p>The game listens through your microphone and scores every word it hears.</p>
      </div>

      <Levels mode="sing" />

      <div className={styles.rules}>
        <article className={`${styles.rule} ${styles.featured}`}>
          <span>How scoring works</span>
          <strong>Heard or not heard.</strong>
          <p>Every word the game hears counts: no tries, no lost points.</p>
          <small>
            A word sung up to {grace} second early or late still counts for its line.
          </small>
        </article>
        <article className={styles.rule}>
          <span>The song waits</span>
          <strong>On Easy and Medium.</strong>
          <p>
            If a line ends with words missing, the song waits up to {singWait} seconds and keeps
            listening. It carries on as soon as you finish.
          </p>
        </article>
        <article className={styles.rule}>
          <span>Before you sing</span>
          <strong>Headphones on, microphone allowed.</strong>
          <p>
            Headphones let the game hear you, not the singer. Your browser asks for the
            microphone the first time.
          </p>
        </article>
        <article className={`${styles.rule} ${styles.wide}`}>
          <span>Language and privacy</span>
          <strong>English or Spanish.</strong>
          <p>
            The game listens for the song&apos;s language; you can change it on the song&apos;s
            screen. Your voice is turned into words by the browser&apos;s online speech service.
            Lyric Drop never keeps recordings.
          </p>
        </article>
        <article className={`${styles.rule} ${styles.wide}`}>
          <span>What stays visible?</span>
          <strong>Sounds and most names don&apos;t count.</strong>
          <p>
            “Oh”, “yeah”, “la la” and most names of artists or places stay on screen and are
            never part of your score.
          </p>
        </article>
      </div>
    </div>
  );
}
