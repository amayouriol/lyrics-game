"use client";

import { useSyncExternalStore } from "react";
import type { Language } from "@/lib/language";

// Sing mode's choices, kept in this browser. Storage can be blocked (private
// windows, cleared site data): then they hold until the page is closed.
const MODE_KEY = "lyrics-game:play-mode";
const INTRO_KEY = "lyrics-game:sing-intro-seen";
const LANGUAGE_KEY = "lyrics-game:sing-language";

export type PlayMode = "type" | "sing";

const listeners = new Set<() => void>();
const memory = new Map<string, string>();

function read(key: string): string | null {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Not remembered after this page; still holds for now.
  }
  memory.set(key, value);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** A stored value, or null; the server always sees null. */
function useStored(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null
  );
}

/** Type or Sing: your last choice, Type until you pick Sing. */
export function usePlayMode(): [PlayMode, (mode: PlayMode) => void] {
  const mode = useStored(MODE_KEY) === "sing" ? "sing" : "type";
  return [mode, (next) => write(MODE_KEY, next)];
}

const SOURCE_KEY = "lyrics-game:play-source";

export type PlaySource = "youtube" | "spotify";

/** Where music plays from, if you picked: null means YouTube when a video is chosen, else Spotify. */
export function usePlaySource(): [PlaySource | null, (source: PlaySource) => void] {
  const stored = useStored(SOURCE_KEY);
  const source = stored === "youtube" || stored === "spotify" ? stored : null;
  return [source, (next) => write(SOURCE_KEY, next)];
}

/** Whether you've read the headphones note and allowed the microphone once. */
export function useSingIntroSeen(): [boolean, () => void] {
  return [useStored(INTRO_KEY) === "1", () => write(INTRO_KEY, "1")];
}

/** Songs whose listening language you changed, by track id. */
function readLanguages(raw: string | null): Record<string, Language> {
  try {
    const parsed = JSON.parse(raw ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** The language to listen for on a song: your correction if you made one, else the lyrics'. */
export function useSingLanguage(
  trackId: string,
  fromLyrics: Language | null
): [Language | null, (language: Language) => void] {
  const raw = useStored(LANGUAGE_KEY);
  const chosen = readLanguages(raw)[trackId];
  return [
    chosen ?? fromLyrics,
    (language) =>
      write(
        LANGUAGE_KEY,
        JSON.stringify({ ...readLanguages(read(LANGUAGE_KEY)), [trackId]: language })
      ),
  ];
}
