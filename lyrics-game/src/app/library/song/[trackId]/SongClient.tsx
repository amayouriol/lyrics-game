"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowIcon, MicIcon } from "@/components/icons";
import { DIFFICULTIES, DIFFICULTY_ORDER, type Difficulty } from "@/lib/game";
import { LANGUAGES, type Language } from "@/lib/language";
import { SING_DESCRIPTIONS, singLines } from "@/lib/sing";
import { SaveButtons } from "../../SaveButtons";
import { loadSong, playHref, type SongResult } from "./loadSong";
import { askForMic, canRecognizeSpeech, micAccess } from "./play/speech";
import {
  usePlayMode,
  usePlaySource,
  useSingIntroSeen,
  useSingLanguage,
  type PlayMode,
  type PlaySource,
} from "./singPrefs";
import { useVideoMatch, VideoPicker } from "./VideoPicker";
import styles from "./song.module.css";

const noSubscribe = () => () => {};

/** "Set up your game": the song, Type or Sing, the level, and the start button. */
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
  const singCount = song?.kind === "ready" ? singLines(song.lines, level, song.singable).length : 0;
  const [language, setLanguage] = useSingLanguage(
    trackId,
    song?.kind === "ready" ? song.language : null
  );
  const mic = useMic(mode === "sing");
  const [chosenSource, setSource] = usePlaySource();
  const [match, setMatch] = useVideoMatch(trackId);
  // Your pick if you made one, else YouTube once the song has a video, else Spotify.
  const source: PlaySource = chosenSource ?? (match ? "youtube" : "spotify");
  const waitingForVideo = source === "youtube" && !match;
  const canPlay =
    match !== undefined &&
    !waitingForVideo &&
    (mode === "sing" ? singCount > 0 && mic.ready && language !== null : blankCount > 0);
  const playLabel = mode === "sing" ? "Sing the song" : "Type the lyrics";
  const playIcon = mode === "sing" ? <MicIcon /> : <ArrowIcon />;

  return (
    <main className={styles.main}>
      <Link href={backHref} className={styles.back}>
        <ArrowIcon />
        Back to library
      </Link>

      <div className={styles.layout}>
        <div className={styles.coverWrap}>
          {/* Spotify's rules: the cover as given, nothing on it. The made-up cover is only for songs without one. */}
          {track?.cover ? (
            <div
              className={styles.cover}
              style={{ backgroundImage: `url(${track.cover})` }}
              role="img"
              aria-label={`Cover of ${track.title}`}
            />
          ) : (
            <div className={`${styles.cover} ${styles.coverMade}`} aria-hidden="true">
              <span className={styles.orbit} />
              {track && (
                <>
                  <span className={styles.initial}>{track.title.slice(0, 1)}</span>
                  <span className={styles.coverLabel}>
                    <small>Lyric Drop presents</small>
                    <strong>{track.title}</strong>
                    <b>{track.artist}</b>
                  </span>
                </>
              )}
            </div>
          )}
          <p>Selected from your library</p>
        </div>

        <section className={styles.options}>
          <p className={styles.kicker}>Set up your game</p>
          {track && (
            <>
              <h1>{track.title}</h1>
              <h2>{track.artist}</h2>
            </>
          )}

          {!song && <p className={styles.hint}>Fetching synced lyrics…</p>}

          {song?.kind === "ready" && song.status === "available" && (
            <>
              <div className={styles.control}>
                <div className={styles.controlTitle}>
                  <span>How you play</span>
                  <small>Choose one</small>
                </div>
                <div className={styles.segmented}>
                  {(["type", "sing"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={m === mode ? styles.on : ""}
                      aria-pressed={m === mode}
                      disabled={m === "sing" && !canSing}
                      onClick={() => setMode(m)}
                    >
                      {m === "sing" && <MicIcon />}
                      {m === "type" ? "Type" : "Sing"}
                    </button>
                  ))}
                </div>
                {!canSing && (
                  <p className={styles.small}>
                    Sing mode doesn&apos;t work in this browser. Try Chrome or Edge.
                  </p>
                )}
              </div>

              <div className={styles.control}>
                <div className={styles.controlTitle}>
                  <span>Difficulty</span>
                  <small>{DIFFICULTIES[level].points} points per word</small>
                </div>
                <div className={`${styles.segmented} ${styles.three}`}>
                  {DIFFICULTY_ORDER.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={d === level ? styles.on : ""}
                      aria-pressed={d === level}
                      onClick={() => setLevel(d)}
                    >
                      {DIFFICULTIES[d].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.control}>
                <div className={styles.controlTitle}>
                  <span>Music from</span>
                  <small>
                    {source === "youtube" ? "A short ad can play first" : "Needs Spotify Premium"}
                  </small>
                </div>
                <div className={styles.segmented}>
                  {(["youtube", "spotify"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={s === source ? styles.on : ""}
                      aria-pressed={s === source}
                      onClick={() => setSource(s)}
                    >
                      {s === "youtube" ? "YouTube" : "Spotify"}
                    </button>
                  ))}
                </div>
                {source === "youtube" && (
                  <VideoPicker
                    trackId={trackId}
                    track={song.track}
                    match={match}
                    onChoose={setMatch}
                  />
                )}
              </div>

              <div className={styles.explanation}>
                <strong>
                  {mode === "sing" ? SING_DESCRIPTIONS[level] : DIFFICULTIES[level].description}
                </strong>
                <span>
                  {mode === "sing"
                    ? `${singCount} ${singCount === 1 ? "line" : "lines"} to sing · ${song.track.duration}`
                    : `${blankCount} ${blankCount === 1 ? "word" : "words"} to type · ${song.track.duration}`}
                </span>
              </div>

              {mode === "sing" && (
                <LanguageNote
                  language={language}
                  fromLyrics={song.language}
                  onChange={setLanguage}
                />
              )}

              {mode === "sing" && !mic.ready && <MicPanel mic={mic} />}

              <div className={styles.actions}>
                {canPlay ? (
                  <Link href={playHref(trackId, from, level, mode, source)} className={styles.start}>
                    {playLabel}
                    <i>{playIcon}</i>
                  </Link>
                ) : (
                  <button className={styles.start} disabled>
                    {playLabel}
                    <i>{playIcon}</i>
                  </button>
                )}
                <SaveButtons song={{ id: trackId, ...song.track }} size="lg" />
              </div>
              {mode === "type" && blankCount === 0 && (
                <p className={styles.hint}>No words to guess at this level.</p>
              )}
              {mode === "sing" && singCount === 0 && (
                <p className={styles.hint}>No lines to sing in this song.</p>
              )}
            </>
          )}

          {song?.kind === "ready" && song.status === "unavailable" && (
            <p className={styles.hint}>Lyrics not available</p>
          )}

          {song?.kind === "lyrics_error" && (
            <div className={styles.panel}>
              <h3>The lyrics service is having a moment.</h3>
              <p>We couldn&apos;t fetch synced lyrics for this song. Your library is fine.</p>
              <button className={styles.panelButton} onClick={retry}>
                Retry
              </button>
            </div>
          )}

          {song?.kind === "error" && (
            <div className={styles.panel}>
              <h3>Spotify didn&apos;t answer.</h3>
              <p>We couldn&apos;t load this song. It&apos;s probably a blip.</p>
              <button className={styles.panelButton} onClick={retry}>
                Retry
              </button>
            </div>
          )}

          {song?.kind === "not_found" && (
            <p className={styles.hint}>This song couldn&apos;t be found.</p>
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
      <div className={styles.panel}>
        <h3>Sing mode needs your microphone.</h3>
        <p>
          It&apos;s blocked for this site. Click the icon at the left of the address bar, set
          Microphone to Allow, then try again. Typing works as usual.
        </p>
        <button className={styles.panelButton} onClick={mic.recheck}>
          Try again
        </button>
      </div>
    );
  }
  if (mic.state === "no_mic") {
    return (
      <div className={styles.panel}>
        <h3>No microphone found.</h3>
        <p>Plug one in (a headset works), then try again. Typing works as usual.</p>
        <button className={styles.panelButton} onClick={mic.allow}>
          Try again
        </button>
      </div>
    );
  }
  return (
    <div className={styles.panel}>
      <h3>Put on headphones.</h3>
      <p>
        Sing mode listens through your microphone. With headphones it hears you, not the singer.
      </p>
      <p>
        Your voice is turned into words by your browser&apos;s speech service (online; Google runs
        it in Chrome). The app only keeps which words were heard, never a recording.
      </p>
      <button className={styles.panelButton} onClick={mic.allow}>
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
      <div className={styles.language}>
        <div className={styles.languageText}>
          <MicIcon />
          <span>Will you sing in English or Spanish?</span>
        </div>
        {(["en", "es"] as const).map((l) => (
          <button key={l} type="button" className={styles.languagePick} onClick={() => onChange(l)}>
            {LANGUAGES[l]}
          </button>
        ))}
      </div>
    );
  }
  const other: Language = language === "en" ? "es" : "en";
  return (
    <>
      <div className={styles.language}>
        <div className={styles.languageText}>
          <MicIcon />
          <span>
            Listens for <strong>{LANGUAGES[language]}</strong> words
          </span>
        </div>
        <button type="button" className={styles.change} onClick={() => onChange(other)}>
          Change
        </button>
        <button
          type="button"
          className={`${styles.help} ${open ? styles.helpOpen : ""}`}
          aria-expanded={open}
          aria-label="Why choose a language?"
          onClick={() => setOpen((o) => !o)}
        >
          ?
        </button>
      </div>
      {open && (
        <div className={styles.helpText}>
          <strong>Why choose a language?</strong>
          <p>
            Sing mode turns your voice into words in one language at a time. It&apos;s set to{" "}
            {LANGUAGES[language]}
            {language === fromLyrics ? ", picked from this song's lyrics" : ""}. If you&apos;ll
            sing it in {LANGUAGES[other]}, change it. The song itself doesn&apos;t change.
          </p>
        </div>
      )}
    </>
  );
}
