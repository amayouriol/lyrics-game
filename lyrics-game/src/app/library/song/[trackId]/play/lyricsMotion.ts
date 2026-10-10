"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import type { TimedLine } from "@/lib/game";

/** How long lines take to glide into place when the song reaches a new one. */
const GLIDE_MS = 350;

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Lines glide when the song reaches a new one. Each line stays the same
 * element as it moves from current to previous, so its position before and
 * after can be compared (layout positions, which transforms don't affect)
 * and the difference animated away. The line shown always comes from the
 * song's position; the animation only follows it. Lines are the elements
 * with a `data-key` inside `lyricsRef`.
 */
export function useLineGlide(lyricsRef: RefObject<HTMLDivElement | null>, currentLine: number) {
  const placesRef = useRef(new Map<string, { x: number; y: number; font: number }>());
  const placedLineRef = useRef(currentLine);
  useLayoutEffect(() => {
    const root = lyricsRef.current;
    if (!root) {
      placesRef.current.clear();
      return;
    }
    const els = [...root.querySelectorAll<HTMLElement>("[data-key]")];
    const places = new Map(
      els.map((el) => [
        el.dataset.key!,
        {
          x: el.offsetLeft + el.offsetWidth / 2,
          y: el.offsetTop + el.offsetHeight / 2,
          font: parseFloat(getComputedStyle(el).fontSize),
        },
      ])
    );
    if (placedLineRef.current !== currentLine && !prefersReducedMotion()) {
      for (const el of els) {
        const before = placesRef.current.get(el.dataset.key!);
        const after = places.get(el.dataset.key!)!;
        el.style.transition = "none";
        el.style.transform = "";
        if (!before) continue;
        const dx = before.x - after.x;
        const dy = before.y - after.y;
        const scale = before.font / after.font;
        if (dx || dy || scale !== 1) {
          el.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
        }
      }
      void root.offsetWidth; // apply the starting positions before animating
      for (const el of els) {
        if (!el.style.transform) continue;
        el.style.transition = `transform ${GLIDE_MS}ms ease, color ${GLIDE_MS}ms ease`;
        el.style.transform = "";
      }
    }
    placedLineRef.current = currentLine;
    placesRef.current = places;
  });
}

/**
 * The sweep: lights each word of the current line as the song gets to it,
 * spread evenly from the line's start to the next line's (or `lastLineEndMs`
 * on the last line). Words are the elements with a `data-at` (0–1). Written
 * straight to the page each frame, so typing never waits for it. With
 * `full`, the whole line is lit at once.
 */
export function useSweep({
  lyricsRef,
  shown,
  full,
  currentLine,
  lines,
  lastLineEndMs,
  getPositionMs,
}: {
  lyricsRef: RefObject<HTMLDivElement | null>;
  shown: boolean;
  full: boolean;
  currentLine: number;
  lines: TimedLine[];
  lastLineEndMs: number;
  getPositionMs: () => number;
}) {
  useEffect(() => {
    const line = lyricsRef.current?.querySelector<HTMLElement>(`[data-key="${currentLine}"]`);
    if (!shown || !line || currentLine < 0) return;
    const words = [...line.querySelectorAll<HTMLElement>("[data-at]")];
    const start = lines[currentLine].timeMs;
    const end = currentLine + 1 < lines.length ? lines[currentLine + 1].timeMs : lastLineEndMs;
    const lightAll = full || prefersReducedMotion();
    let frame = 0;
    const paint = () => {
      const progress = lightAll
        ? 1
        : Math.min(1, Math.max(0, (getPositionMs() - start) / Math.max(1, end - start)));
      for (const word of words)
        word.toggleAttribute("data-lit", progress >= Number(word.dataset.at));
      if (progress < 1) frame = requestAnimationFrame(paint);
    };
    paint();
    return () => cancelAnimationFrame(frame);
  }, [lyricsRef, shown, full, currentLine, lines, lastLineEndMs, getPositionMs]);
}
