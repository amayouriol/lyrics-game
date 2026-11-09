"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./PlayDialog.module.css";

/**
 * The web version's Play button. Signed in, it is a plain link to your home.
 * Otherwise it opens a pop-up with "Sign in with Google".
 */
export function PlayButton({
  className,
  children,
  signedIn,
  notice,
  openOnLoad = false,
}: {
  className: string;
  children: ReactNode;
  signedIn: boolean;
  /** Why the last sign-in did not work, when Google sent you back with a problem. */
  notice?: "failed" | "unavailable";
  /** Only one button on the page opens the pop-up by itself after a failed sign-in. */
  openOnLoad?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (openOnLoad && notice && !signedIn) dialog.current?.showModal();
  }, [openOnLoad, notice, signedIn]);

  if (signedIn) {
    return (
      <a className={className} href="/home">
        {children}
      </a>
    );
  }

  const message =
    notice === "failed"
      ? "The sign-in didn't finish. Try again."
      : notice === "unavailable"
        ? "Sign-in isn't set up yet. Tell whoever runs this game."
        : null;

  return (
    <>
      <button type="button" className={className} onClick={() => dialog.current?.showModal()}>
        {children}
      </button>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="play-dialog-title"
        onClick={(event) => {
          // A click on the dimmed backdrop (the dialog element itself) closes it.
          if (event.target === dialog.current) dialog.current?.close();
        }}
      >
        <button type="button" className={styles.close} aria-label="Close" onClick={() => dialog.current?.close()}>
          ×
        </button>
        <h2 id="play-dialog-title" className={styles.title}>
          Sign in to play.
        </h2>
        <div className={styles.form}>
          <p className={styles.text}>
            Your songs and games are kept with your Google account, so they follow you to any device.
          </p>
          {message && (
            <p className={styles.problem} role="alert">
              {message}
            </p>
          )}
          {/* Plain link: this leaves for Google and should not be prefetched. */}
          <a className="btn btn--lg" href="/api/auth/google">
            <GoogleIcon />
            Sign in with Google
          </a>
          <p className={styles.fine}>We only see your name, email and picture.</p>
        </div>
      </dialog>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg className={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
