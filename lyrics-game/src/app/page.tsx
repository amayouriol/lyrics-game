import { Header } from "@/components/Header";
import { isWebMode } from "@/lib/app-mode";
import { currentProfile, getSession, hasAccess, isThisMachine } from "@/lib/session";
import { HomeClient } from "./HomeClient";
import styles from "./page.module.css";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const session = await getSession();
  const { expired } = await searchParams;
  const web = isWebMode();
  // A session that ran out sends you here with ?expired, even if you use the app without Spotify.
  // The web version always shows the start page; its home is /home.
  if (!web && !expired && (await hasAccess(session))) {
    const profile = await currentProfile(session);
    return (
      <>
        <Header profile={profile} />
        <HomeClient name={profile.name} />
      </>
    );
  }
  const canSkipSpotify = !web && (await isThisMachine());

  return (
    <main className={styles.main} id="top">
      <section className={styles.hero} aria-labelledby="welcome-title">
        <div className={styles.grain} aria-hidden="true" />

        <header className={styles.topbar}>
          <a className={styles.brand} href="#top" aria-label="Lyric Drop home">
            <span className={styles.logoWordmark} aria-hidden="true">
              <span className={styles.logoTopLine}>LYRIC</span>
              <span className={styles.logoBottomLine}>
                DR<span className={styles.logoUnderscore}>_</span>P
                <i className={styles.droppedLetter}>O</i>
              </span>
            </span>
          </a>
        </header>

        <div className={styles.heroCopy}>
          {!web && expired && (
            <div className={styles.banner} role="status">
              Your session expired. Reconnect and you&apos;ll land right back on your home page.
            </div>
          )}

          <h1 id="welcome-title">
            {web ? "Turn any song into" : "Turn your playlist into"}
            <br />
            <em>karaoke.</em>
          </h1>
          <p className={styles.heroIntro}>
            The song starts. The lyrics fade. Can you sing the missing words?
          </p>

          {web ? (
            <a className={styles.primaryCta} href="/home" aria-describedby="web-note">
              <span>Play</span>
              <i aria-hidden="true">
                <ArrowIcon />
              </i>
            </a>
          ) : (
            // Plain link: this starts Spotify auth and should not be prefetched.
            <a className={styles.primaryCta} href="/api/auth/login" aria-describedby="spotify-note">
              <SpotifyIcon />
              <span>
                Connect with Spotify<sup aria-hidden="true">*</sup>
              </span>
              <i aria-hidden="true">
                <ArrowIcon />
              </i>
            </a>
          )}

          {canSkipSpotify && (
            <a className={styles.localLink} href="/api/auth/local">
              Or use the app without Spotify (YouTube songs only)
            </a>
          )}

          {web ? (
            <p className={styles.disclaimer} id="web-note">
              Songs play from YouTube, in YouTube&apos;s own player. No account needed.
            </p>
          ) : (
            <p className={styles.disclaimer} id="spotify-note">
              <span aria-hidden="true">*</span> Spotify Premium is required for playback. We use
              playlists you own and your Liked Songs, not playlists you follow.
            </p>
          )}
        </div>

        <div className={styles.musicNotes} aria-hidden="true">
          <svg className={`${styles.note} ${styles.noteOne}`} viewBox="0 0 80 110">
            <path d="M26 82V27l39-9v54" />
            <ellipse cx="17" cy="85" rx="14" ry="10" />
            <ellipse cx="56" cy="75" rx="14" ry="10" />
          </svg>
          <svg className={`${styles.note} ${styles.noteTwo}`} viewBox="0 0 55 75">
            <path d="M18 55V13l28-7v38" />
            <ellipse cx="11" cy="58" rx="10" ry="7" />
            <ellipse cx="39" cy="47" rx="10" ry="7" />
          </svg>
          <svg className={`${styles.note} ${styles.noteThree}`} viewBox="0 0 44 66">
            <path d="M14 50V8l23 7" />
            <ellipse cx="8" cy="53" rx="8" ry="6" />
          </svg>
          <span className={`${styles.soundWave} ${styles.waveOne}`} />
          <span className={`${styles.soundWave} ${styles.waveTwo}`} />
          <span className={`${styles.soundWave} ${styles.waveThree}`} />
        </div>

        <div className={styles.recordStage} aria-hidden="true">
          <div className={styles.record}>
            <div className={styles.recordShine} />
            <div className={styles.recordLabel}>
              <span className={`${styles.logoWordmark} ${styles.recordLogo}`}>
                <span className={styles.logoTopLine}>LYRIC</span>
                <span className={styles.logoBottomLine}>
                  DR<span className={styles.logoUnderscore}>_</span>P
                </span>
              </span>
            </div>
          </div>
        </div>

        <a className={styles.scrollCue} href="#how-it-works">
          <span>See how the game works</span>
        </a>
      </section>

      <section className={styles.howSection} id="how-it-works" aria-labelledby="how-title">
        <div className={styles.gameNoise} aria-hidden="true" />
        <div className={styles.gameKicker}>
          <span>How it plays</span>
          <span>{web ? "YouTube songs · your lyrics" : "Your library · your lyrics"}</span>
        </div>

        <div className={styles.gameGrid}>
          <div className={styles.gameMessage}>
            <h2 id="how-title">
              Don&apos;t just
              <br />
              know it.
              <br />
              <em>Sing it.</em>
            </h2>
          </div>

          <div className={styles.stepsCard}>
            <p className={styles.stepsIntro}>Your music takes center stage.</p>
            <ol className={styles.steps}>
              {(web ? WEB_STEPS : STEPS).map(([number, title, detail]) => (
                <li key={number}>
                  <span className={styles.stepNumber}>{number}</span>
                  <span>
                    <b>{title}</b>
                    <small>{detail}</small>
                  </span>
                </li>
              ))}
            </ol>
            <a className={styles.cardCta} href={web ? "/home" : "/api/auth/login"}>
              <span>Get started</span>
              <ArrowIcon />
            </a>
          </div>
        </div>

        <footer className={styles.footer}>
          <a href="#top">
            Back to the top
            <ArrowIcon />
          </a>
        </footer>
      </section>
    </main>
  );
}

const STEPS = [
  ["01", "Connect Spotify", "Sign in with a Premium account."],
  ["02", "Pick one of your songs", "Choose a playlist you own or a liked song."],
  ["03", "Finish the line", "Sing along and guess the missing words."],
];

const WEB_STEPS = [
  ["01", "Add a song from YouTube", "Search by name, or paste a link or playlist."],
  ["02", "Pick your game", "Type or Sing, then a level."],
  ["03", "Finish the line", "Sing along and guess the missing words."],
];

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

function SpotifyIcon() {
  return (
    <svg className={styles.spotifyIcon} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#101010" />
      <path
        d="M6.3 9.1c3.8-1.2 8.7-.7 11.7 1.1M7.1 12.1c3.2-1 7.2-.5 9.9 1M7.8 15c2.5-.7 5.7-.4 7.9.8"
        fill="none"
        stroke="#1ed760"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}
