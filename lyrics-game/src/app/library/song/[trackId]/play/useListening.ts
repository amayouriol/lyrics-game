"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { HeardWord } from "@/lib/sing";
import { canRecognizeSpeech, recognitionClass, type Recognition } from "./speech";

/** Restarts in a row without hearing anything before giving up ("Not listening"). */
const MAX_FAILED_RESTARTS = 5;
/** A listening session at least this long wasn't a failure, even if it heard nothing. */
const HEALTHY_SESSION_MS = 5_000;

export type ListeningState = "off" | "starting" | "on" | "failed";
export type ListeningProblem = "unsupported" | "denied" | "no_mic" | "stopped";

const noSubscribe = () => () => {};

/**
 * Listens while `active` (the song playing) and reports each word heard
 * with when in the song it was heard. The browser stops listening by itself
 * now and then (every ~8 s of silence, sometimes mid-song): it's started
 * again straight away, and time spent not listening is added up for the
 * results. A refused or missing microphone stops it for good, until retry.
 */
export function useListening({
  lang,
  active,
  getPositionMs,
}: {
  lang: string;
  active: boolean;
  getPositionMs: () => number;
}) {
  // Known only in the browser; the server assumes yes, so nothing flickers.
  const supported = useSyncExternalStore(noSubscribe, canRecognizeSpeech, () => true);
  const [heard, setHeard] = useState<HeardWord[]>([]);
  const [on, setOn] = useState(false);
  const [hearing, setHearing] = useState(false);
  const [problem, setProblem] = useState<ListeningProblem | null>(null);
  const [attempt, setAttempt] = useState(0);

  /** Each result's words, so the browser revising a guess replaces it. */
  const byResult = useRef(new Map<string, HeardWord[]>());
  const runRef = useRef(0);
  /** Time spent not listening while the song played. */
  const offRef = useRef<{ since: number | null; totalMs: number }>({ since: null, totalMs: 0 });

  useEffect(() => {
    const Rec = recognitionClass();
    if (!active || !Rec) return;
    const run = ++runRef.current;
    const off = offRef.current;
    let stopped = false;
    let fatal = false;
    let session = 0;
    let failures = 0;
    let startedAt = 0;
    let current: Recognition | null = null;

    const markOff = () => {
      off.since ??= performance.now();
    };
    const markOn = () => {
      if (off.since !== null) off.totalMs += performance.now() - off.since;
      off.since = null;
    };

    const start = () => {
      const rec = new Rec();
      const thisSession = session;
      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.onstart = () => {
        startedAt = performance.now();
        markOn();
        setOn(true);
      };
      rec.onspeechstart = () => setHearing(true);
      rec.onspeechend = () => setHearing(false);
      rec.onresult = (e) => {
        failures = 0;
        const now = getPositionMs();
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const key = `${run}:${thisSession}:${i}`;
          const before = byResult.current.get(key) ?? [];
          const words = e.results[i][0].transcript.split(/\s+/).filter(Boolean);
          // A revised word keeps the time it was first heard.
          byResult.current.set(
            key,
            words.map((text, j) => ({ text, atMs: before[j]?.atMs ?? now })),
          );
        }
        setHeard([...byResult.current.values()].flat());
      };
      rec.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          fatal = true;
          setProblem("denied");
        } else if (e.error === "audio-capture") {
          fatal = true;
          setProblem("no_mic");
        }
        // Anything else ("no-speech", "network"): the end handler starts again.
      };
      rec.onend = () => {
        setOn(false);
        setHearing(false);
        if (stopped) return;
        markOff();
        if (fatal) return;
        failures = performance.now() - startedAt >= HEALTHY_SESSION_MS ? 0 : failures + 1;
        if (failures > MAX_FAILED_RESTARTS) {
          setProblem("stopped");
          return;
        }
        session += 1;
        start();
      };
      try {
        rec.start();
        current = rec;
      } catch {
        setProblem("stopped");
      }
    };

    markOff();
    start();
    return () => {
      stopped = true;
      current?.abort();
      markOn(); // Paused or finished: not "off" time.
    };
  }, [active, lang, attempt, getPositionMs]);

  /** Starts listening again after "Not listening", or after allowing the microphone. */
  const retry = useCallback(() => {
    setProblem(null);
    setAttempt((a) => a + 1);
  }, []);

  /** Time spent not listening while the song played, so far (for the results). */
  const getOffMs = useCallback(() => {
    const off = offRef.current;
    return off.totalMs + (off.since === null ? 0 : performance.now() - off.since);
  }, []);

  const state: ListeningState =
    !supported || problem ? "failed" : on ? "on" : active ? "starting" : "off";

  return {
    heard,
    state,
    problem: supported ? problem : "unsupported",
    hearing: on && hearing,
    retry,
    getOffMs,
  };
}
