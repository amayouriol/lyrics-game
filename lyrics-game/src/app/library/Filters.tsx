"use client";

import { LANGUAGES, type Language } from "@/lib/language";
import type { LyricsStatus } from "@/lib/lyrics";
import type { LibraryTrack } from "./libraryData";
import styles from "./library.module.css";

export interface FilterState {
  onlyPlayable: boolean;
  language: Language | "any";
  played: "any" | "played" | "not_played";
}

export const DEFAULT_FILTERS: FilterState = { onlyPlayable: true, language: "any", played: "any" };

export function isDefault(f: FilterState): boolean {
  return (
    f.onlyPlayable === DEFAULT_FILTERS.onlyPlayable &&
    f.language === DEFAULT_FILTERS.language &&
    f.played === DEFAULT_FILTERS.played
  );
}

/**
 * Whether a song passes the filters. Songs still being checked stay until
 * their check says otherwise; a song with no known language only shows
 * under Any.
 */
export function passesFilters(
  t: LibraryTrack,
  f: FilterState,
  statusOf: (t: LibraryTrack) => LyricsStatus,
  languageOf: (t: LibraryTrack) => Language | null
): boolean {
  if (f.onlyPlayable && statusOf(t) === "unavailable") return false;
  if (f.language !== "any" && languageOf(t) !== f.language) return false;
  if (f.played === "played" && !t.played) return false;
  if (f.played === "not_played" && t.played) return false;
  return true;
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.filterGroup} role="group" aria-label={label}>
      <span className={styles.filterLabel}>{label}</span>
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          className="chip chip--tertiary chip--sm"
          aria-pressed={v === value}
          onClick={() => onChange(v)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/** The filter chips above a list of songs. */
export function Filters({
  value,
  onChange,
}: {
  value: FilterState;
  onChange: (value: FilterState) => void;
}) {
  return (
    <div className={styles.filters}>
      <button
        type="button"
        className="chip chip--tertiary chip--sm"
        aria-pressed={value.onlyPlayable}
        onClick={() => onChange({ ...value, onlyPlayable: !value.onlyPlayable })}
      >
        Only playable
      </button>
      <Choice
        label="Language"
        value={value.language}
        options={[["any", "Any"], ...(Object.entries(LANGUAGES) as [Language, string][])]}
        onChange={(language) => onChange({ ...value, language })}
      />
      <Choice
        label="Played"
        value={value.played}
        options={[
          ["any", "Any"],
          ["played", "Played"],
          ["not_played", "Not played"],
        ]}
        onChange={(played) => onChange({ ...value, played })}
      />
    </div>
  );
}

/** When the filters leave nothing. Clearing returns to the defaults (only playable). */
export function NoFilterMatch({ onClear }: { onClear: () => void }) {
  return (
    <div className={styles.hint}>
      No songs match these filters.{" "}
      <button type="button" className="btn btn--ghost btn--sm" onClick={onClear}>
        Clear filters
      </button>
    </div>
  );
}
