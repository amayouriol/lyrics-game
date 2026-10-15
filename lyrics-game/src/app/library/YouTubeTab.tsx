"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowIcon, NoteIcon } from "@/components/icons";
import type { OwnSource } from "@/lib/own-library";
import { AddFromYouTube } from "./AddFromYouTube";
import { fetchJson, playlistHref } from "./libraryData";
import styles from "./library.module.css";

type Loaded =
  | { key: number; status: "ready"; sources: OwnSource[] }
  | { key: number; status: "error" };

/** Songs and playlists added from YouTube: two ways to add, then the lists as cards. */
export function YouTubeTab() {
  const router = useRouter();
  const [key, setKey] = useState(0);
  const [result, setResult] = useState<Loaded | null>(null);

  useEffect(() => {
    let ignore = false;
    fetchJson<{ sources: OwnSource[] }>("/api/own/lists").then((r) => {
      if (ignore) return;
      if (r.status === "expired") {
        router.push("/?expired=1");
        return;
      }
      setResult(
        r.status === "ok"
          ? { key, status: "ready", sources: r.data.sources }
          : { key, status: "error" }
      );
    });
    return () => {
      ignore = true;
    };
  }, [key, router]);

  const current = result && result.key === key ? result : null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeading}>
        <div>
          <p>Free to play, no Spotify needed</p>
          <h2>Your YouTube songs</h2>
        </div>
      </div>

      <AddFromYouTube onAdded={() => setKey((k) => k + 1)} />

      {!current && <p className={styles.hint}>Loading your YouTube songs…</p>}

      {current?.status === "error" && (
        <div className={styles.errorPanel}>
          <h2>Your YouTube songs didn&apos;t load.</h2>
          <p>It&apos;s probably a blip.</p>
          <button className={styles.smallButton} onClick={() => setKey((k) => k + 1)}>
            Retry
          </button>
        </div>
      )}

      {current?.status === "ready" && current.sources.length === 0 && (
        <p className={styles.hint}>
          Nothing here yet. Paste a link or search above, and your songs show up as cards.
        </p>
      )}

      {current?.status === "ready" && current.sources.length > 0 && (
        <div className={styles.cards}>
          {current.sources.map((source) => (
            <Link key={source.id} href={playlistHref(source.id)} className={styles.card}>
              <span
                className={`${styles.cardCover} ${source.cover ? "" : styles.tile_playlist}`}
                style={source.cover ? { backgroundImage: `url(${source.cover})` } : undefined}
              >
                {!source.cover && <NoteIcon />}
              </span>
              <span className={styles.cardText}>
                <strong>{source.name}</strong>
                <small>
                  {source.count} {source.count === 1 ? "song" : "songs"}
                </small>
              </span>
              <i className={styles.cardArrow}>
                <ArrowIcon />
              </i>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
