"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DIFFICULTIES, DIFFICULTY_ORDER, type Difficulty } from "@/lib/game";
import { LANGUAGES, type Language } from "@/lib/language";
import { SING_DESCRIPTIONS, singLines } from "@/lib/sing";
import { SaveButtons } from "../../SaveButtons";
import { loadSong, playHref, type SongResult } from "./loadSong";
import { askForMic, canRecognizeSpeech, micAccess } from "./play/speech";
import { usePlayMode, useSingIntroSeen, useSingLanguage, type PlayMode } from "./singPrefs";
import styles from "./song.module.css";

const noSubscribe = () => () => {};

export function SongClient({ trackId, from }: { trackId: string; from: string | null }) {
  const router = useRouter();
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState<{ key: number; value: SongResult } | null>(null);
  const [level, setLevel] = useState<Difficulty>("medium");
  const [chosenMode, setMode] = usePlayMode();
  // Known only in the browser; the server assumes yes, so nothing flickers.
  const canSing = useSyncExternalStore(noSubscribe, canRecognizeSpeech, () => true);
  const mode: PlayMode = canSing ? chosenMode : "type";

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
  const track = song && "track" in song ? song.track : null;
  const backHref = from ? `/library?source=${encodeURIComponent(from)}` : "/library";
  const retry = () => setReloadKey((k) => k + 1);
  const blankCount = song?.kind === "ready" ? song.blanks[level].length : 0;
  const singCount = song?.kind === "ready" ? singLines(song.lines, level).length : 0;
  const [language, setLanguage] = useSingLanguage(
    trackId,
    song?.kind === "ready" ? song.language : null
  );
  const mic = useMic(mode === "sing");
  const canPlay =
    mode === "sing" ? singCount > 0 && mic.ready && language !== null : blankCount > 0;
  const playLabel = mode === "sing" ? "Sing the song" : "Play the song";

  return (
    <main className={styles.main}>
      <div>
        <Link href={backHref} className="btn btn--ghost btn--sm">
          Back to library
        </Link>
      </div>

      <div className={styles.layout}>
        <div
          className={styles.cover}
          style={track?.cover ? { backgroundImage: `url(${track.cover})` } : undefined}
        >
          {track && !track.cover && <span className={styles.coverTitle}>{track.title}</span>}
        </div>

        <section className={styles.info}>
          {track && (
            <div className={styles.titles}>
              <h1>{track.title}</h1>
              <span className={styles.artist}>{track.artist}</span>
            </div>
          )}

          {!song && <div className={styles.hint}>Fetching synced lyrics…</div>}

          {song?.kind === "ready" && song.status === "available" && (
            <>
              <div className={styles.setup}>
                <div className={styles.setupLabel}>How you play</div>
                <div className={styles.levels}>
                  {(["type", "sing"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      className="chip chip--tertiary"
                      aria-pressed={m === mode}
                      disabled={m === "sing" && !canSing}
                      onClick={() => setMode(m)}
                    >
                      {m === "type" ? "Type" : "Sing"}
                    </button>
                  ))}
                </div>
                {!canSing && (
                  <p className={styles.note}>
                    Sing mode doesn&apos;t work in this browser. Try Chrome or Edge.
                  </p>
                )}

                <div className={styles.setupLabel}>Difficulty</div>
                <div className={styles.levels}>
                  {DIFFICULTY_ORDER.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className="chip chip--tertiary"
                      aria-pressed={d === level}
                      onClick={() => setLevel(d)}
                    >
                      {DIFFICULTIES[d].label}
                    </button>
                  ))}
                </div>
                <p className={styles.levelDescription}>
                  {mode === "sing" ? SING_DESCRIPTIONS[level] : DIFFICULTIES[level].description}
                </p>
                <div className={styles.meta}>
                  {mode === "sing"
                    ? `${singCount} lines to sing · ${song.track.duration}`
                    : `${blankCount} blanks · ${song.lineCount} lines · ${song.track.duration}`}
                </div>
                {mode === "sing" && (
                  <LanguageNote
                    language={language}
                    fromLyrics={song.language}
                    onChange={setLanguage}
                  />
                )}
              </div>

              {mode === "sing" && !mic.ready && <MicPanel mic={mic} />}

              <div className={styles.actions}>
                {canPlay ? (
                  <Link href={playHref(trackId, from, level, mode)} className="btn btn--lg">
                    {playLabel}
                  </Link>
                ) : (
                  <button className="btn btn--lg" disabled>
                    {playLabel}
                  </button>
                )}
                <SaveButtons song={{ id: trackId, ...song.track }} size="lg" />
              </div>
              {mode === "type" && blankCount === 0 && (
                <div className={styles.hint}>No words to guess at this level.</div>
              )}
              {mode === "sing" && singCount === 0 && (
                <div className={styles.hint}>No lines to sing in this song.</div>
              )}
            </>
          )}

          {song?.kind === "ready" && song.status === "unavailable" && (
            <div className={styles.hint}>Lyrics not available</div>
          )}

          {song?.kind === "lyrics_error" && (
            <div className={styles.errorPanel}>
              <h2>The lyrics service is having a moment.</h2>
              <p>We couldn&apos;t fetch synced lyrics for this song. Your library is fine.</p>
              <button className="btn btn--secondary" onClick={retry}>
                Retry
              </button>
            </div>
          )}

          {song?.kind === "error" && (
            <div className={styles.errorPanel}>
              <h2>Spotify didn&apos;t answer.</h2>
              <p>We couldn&apos;t load this song. It&apos;s probably a blip.</p>
              <button className="btn btn--secondary" onClick={retry}>
                Retry
              </button>
            </div>
          )}

          {song?.kind === "not_found" && (
            <div className={styles.hint}>This song couldn&apos;t be found.</div>
          )}
        </section>
      </div>
    </main>
  );
}

type MicState = "checking" | "granted" | "denied" | "prompt" | "no_mic";

/**
 * Whether Sing mode may use the microphone: you've read the headphones note
 * once and the browser allows it. Checked whenever Sing is chosen.
 */
function useMic(wanted: boolean) {
  const [introSeen, markIntroSeen] = useSingIntroSeen();
  const [state, setState] = useState<MicState>("checking");
  const [check, setCheck] = useState(0);

  useEffect(() => {
    if (!wanted) return;
    let ignore = false;
    micAccess().then((access) => {
      if (!ignore) setState(access);
    });
    return () => {
      ignore = true;
    };
  }, [wanted, check]);

  const allow = async () => {
    const result = await askForMic();
    if (result === "granted") markIntroSeen();
    setState(result);
  };

  return {
    state,
    ready: introSeen && state === "granted",
    allow,
    recheck: () => setCheck((c) => c + 1),
  };
}

function MicPanel({ mic }: { mic: ReturnType<typeof useMic> }) {
  if (mic.state === "checking") return null;
  if (mic.state === "denied") {
    return (
      <div className={styles.errorPanel}>
        <h2>Sing mode needs your microphone.</h2>
        <p>
          It&apos;s blocked for this site. Click the icon at the left of the address bar, set
          Microphone to Allow, then try again. Typing works as usual.
        </p>
        <button className="btn btn--secondary" onClick={mic.recheck}>
          Try again
        </button>
      </div>
    );
  }
  if (mic.state === "no_mic") {
    return (
      <div className={styles.errorPanel}>
        <h2>No microphone found.</h2>
        <p>Plug one in (a headset works), then try again. Typing works as usual.</p>
        <button className="btn btn--secondary" onClick={mic.allow}>
          Try again
        </button>
      </div>
    );
  }
  return (
    <div className={styles.errorPanel}>
      <h2>Put on headphones.</h2>
      <p>
        Sing mode listens through your microphone. With headphones it hears you, not the singer.
      </p>
      <p>
        Your voice is turned into words by your browser&apos;s speech service (online; Google runs
        it in Chrome). The app only keeps which words were heard, never a recording.
      </p>
      <button className="btn" onClick={mic.allow}>
        Allow the microphone
      </button>
    </div>
  );
}

/** Which language Sing mode listens for, quietly, with a way to change it. */
function LanguageNote({
  language,
  fromLyrics,
  onChange,
}: {
  language: Language | null;
  fromLyrics: Language | null;
  onChange: (language: Language) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!language) {
    return (
      <div className={styles.note}>
        <p>Will you sing in English or Spanish?</p>
        <div className={styles.levels}>
          {(["en", "es"] as const).map((l) => (
            <button
              key={l}
              type="button"
              className="chip chip--sm chip--grey"
              onClick={() => onChange(l)}
            >
              {LANGUAGES[l]}
            </button>
          ))}
        </div>
      </div>
    );
  }
  const other: Language = language === "en" ? "es" : "en";
  return (
    <div className={styles.note}>
      <p>
        Listens for {LANGUAGES[language]} words ·{" "}
        <button type="button" className={styles.textButton} onClick={() => onChange(other)}>
          Change
        </button>{" "}
        <button
          type="button"
          className={styles.help}
          aria-expanded={open}
          aria-label="What does this mean?"
          onClick={() => setOpen((o) => !o)}
        >
          ?
        </button>
      </p>
      {open && (
        <p className={styles.helpText}>
          Sing mode turns your voice into words in one language at a time. It&apos;s set to{" "}
          {LANGUAGES[language]}
          {language === fromLyrics ? ", picked from this song's lyrics" : ""}. If you&apos;ll sing
          it in {LANGUAGES[other]}, change it. The song itself doesn&apos;t change.
        </p>
      )}
    </div>
  );
}
