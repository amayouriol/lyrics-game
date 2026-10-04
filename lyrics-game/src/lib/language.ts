/** A song's language, from its lyrics. Pure, so the rule can be checked. */

import { normalize, tokenize } from "./game";

export type Language = "en" | "es";

export const LANGUAGES: Record<Language, string> = { en: "English", es: "Spanish" };

/** Bit flags: which word lists a word is in. */
export const IN_ENGLISH = 1;
export const IN_SPANISH = 2;

/** Fewer telling words than this and the language is left unknown. */
const MIN_WORDS = 8;
/**
 * Below this share of words found in either list, the song is in another
 * language. French and Portuguese songs score 38–72% (short words like "la"
 * and "de" are in the Spanish list); English and Spanish ones from ~74%.
 */
const MIN_KNOWN_SHARE = 0.72;

/**
 * The language with more words found only in its own word list ("night"
 * is English only, "noche" Spanish only, "me" and "a" are both and count
 * for neither). Unknown if there are too few such words, a tie, or most
 * words are in neither list (another language, e.g. French).
 */
export function languageOf(
  lines: { text: string }[],
  listsOf: (normalizedWord: string) => number
): Language | null {
  let english = 0;
  let spanish = 0;
  let known = 0;
  let total = 0;
  for (const line of lines) {
    for (const { core } of tokenize(line.text)) {
      const word = normalize(core);
      if (!/^\p{L}{2,}$/u.test(word)) continue;
      const lists = listsOf(word);
      total++;
      if (lists) known++;
      if (lists === IN_ENGLISH) english++;
      else if (lists === IN_SPANISH) spanish++;
    }
  }
  if (english + spanish < MIN_WORDS || english === spanish) return null;
  if (known / total < MIN_KNOWN_SHARE) return null;
  return english > spanish ? "en" : "es";
}
