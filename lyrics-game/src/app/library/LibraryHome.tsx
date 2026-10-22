"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowIcon,
  BookmarkIcon,
  HeartIcon,
  NoteIcon,
  PlayIcon,
  RefreshIcon,
} from "@/components/icons";
import type { SavedListName } from "@/lib/saved";
import type { Source } from "@/lib/spotify";
import { ago, fetchJson, moment, playlistHref, spotifyTrouble, type LoadState } from "./libraryData";
import { LibrarySearch } from "./LibrarySearch";
import { SearchBox } from "./SearchBox";
import { useSaved } from "./SavedProvider";
import { songHref } from "./song/[trackId]/loadSong";
import { AddFromYouTube } from "./AddFromYouTube";
import { useOwnLists } from "./useOwnLists";
import { YourListsTab } from "./YourListsTab";
import styles from "./library.module.css";

export type LibraryTab = "saved" | "lists" | "spotify";

/**
 * The library's main page: the box for adding songs first, then a search
 * across what you have, and the tabs below it: your lists (what you added
 * from YouTube), what you saved in the game, and, with Spotify, your Spotify
 * lists. Searching replaces the tabs with the songs found.
 */
export function LibraryHome({ initialTab, web }: { initialTab: LibraryTab; web: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab);
  const [search, setSearch] = useState("");
  const lists = useOwnLists();

  // The tab is kept in the address, so coming back from a playlist returns to it.
  const choose = (next: LibraryTab) => {
    setTab(next);
    router.replace(next === "lists" ? "/library" : `/library?tab=${next}`, { scroll: false });
  };

  const tabs: { id: LibraryTab; name: string; about: string }[] = [
    { id: "lists", name: "Your lists", about: "Songs and playlists you added" },
    { id: "saved", name: "Saved in Lyric Drop", about: "Your picks and game collections" },
    ...(web ? [] : [{ id: "spotify" as const, name: "From Spotify", about: "Liked songs and playlists" }]),
  ];

  return (
    <main className={styles.screen}>
      <section className={`${styles.top} ${styles.topList}`}>
        <div className={styles.title}>
          <p>Your music</p>
          <h1>
            Find your
            <br />
            <em>next song.</em>
          </h1>
        </div>
      </section>

      <section className={styles.addSection}>
        {/* Only a web friend starts with nothing; on your own computer the library is rarely empty. */}
        <AddFromYouTube onAdded={lists.reload} first={web && lists.status === "ready" && lists.sources.length === 0} />
      </section>

      <div className={styles.libraryTools}>
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search the songs you added"
          tone="light"
        />
      </div>

      {search.trim() !== "" ? (
        <LibrarySearch search={search} />
      ) : (
        <>
          <div
            className={styles.tabs}
            style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
            role="tablist"
            aria-label="Library source"
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={tab === t.id ? styles.tabActive : ""}
                onClick={() => choose(t.id)}
              >
                <span>{t.name}</span>
                <small>{t.about}</small>
              </button>
            ))}
          </div>
          {tab === "saved" ? (
            <SavedTab />
          ) : tab === "spotify" ? (
            <SpotifyTab />
          ) : (
            <YourListsTab lists={lists} />
          )}
        </>
      )}
    </main>
  );
}

/** Songs shown per card; "See all" opens the full list. */
const CARD_SONGS = 5;

const CARDS: { list: SavedListName; title: string; empty: [string, string] }[] = [
  {
    list: "favorites",
    title: "Favorites",
    empty: ["Your favorite songs live here.", "Use the heart on any song to keep it here."],
  },
  {
    list: "later",
    title: "Play later",
    empty: ["Your next songs live here.", "Bookmark any track to build a game queue."],
  },
];

function SavedTab() {
  const { lists, failed, reload } = useSaved();
  const total = lists ? lists.favorites.length + lists.later.length : null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeading}>
        <div>
          <p>Curated by you</p>
          <h2>Saved in the game</h2>
        </div>
        {total !== null && <span>{total} saved</span>}
      </div>

      {!lists && !failed && <p className={styles.hint}>Loading your saved songs…</p>}
      {failed && (
        <div className={styles.notice}>
          <span>Your saved songs didn&apos;t load.</span>
          <button className={styles.smallButton} onClick={reload}>
            Retry
          </button>
        </div>
      )}

      {lists && (
        <div className={styles.savedGrid}>
          {CARDS.map(({ list, title, empty }) => {
            const songs = lists[list];
            return (
              <article key={list} className={`${styles.savedCard} ${styles[`savedCard_${list}`]}`}>
                <Link href={playlistHref(list)} className={styles.savedCardHeading}>
                  <span>
                    {list === "favorites" ? <HeartIcon filled /> : <BookmarkIcon filled />}
                    {title}
                  </span>
                  <b>{songs.length}</b>
                </Link>
                {songs.length === 0 ? (
                  <div className={styles.savedEmpty}>
                    {list === "favorites" ? <HeartIcon /> : <BookmarkIcon />}
                    <strong>{empty[0]}</strong>
                    <p>{empty[1]}</p>
                  </div>
                ) : (
                  <div className={styles.savedList}>
                    {songs.slice(0, CARD_SONGS).map((song) => (
                      <Link key={song.id} href={songHref(song.id, list)} className={styles.savedSong}>
                        <span
                          className={styles.cover}
                          style={song.cover ? { backgroundImage: `url(${song.cover})` } : undefined}
                        />
                        <span className={styles.songText}>
                          <strong>{song.title}</strong>
                          <small>{song.artist}</small>
                        </span>
                        <PlayIcon />
                      </Link>
                    ))}
                    {songs.length > CARD_SONGS && (
                      <Link href={playlistHref(list)} className={styles.seeAll}>
                        See all {songs.length}
                        <ArrowIcon />
                      </Link>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

interface SourcesAnswer {
  sources: Source[];
  /** When the list was loaded from Spotify. */
  updatedAt: number;
  /** Spotify is refusing until then, so this is an older saved copy. */
  blockedUntil: number | null;
  /** Not logged in to Spotify: this is the saved copy, however old. */
  offline?: boolean;
}

type Loaded =
  | { key: number; status: "ready"; data: SourcesAnswer; loadedAt: number }
  | { key: number; status: "error"; rateLimited: boolean; retryAt?: number };

/**
 * Liked Songs and your playlists as cards. The list comes from the app's
 * saved copy when it's recent; "Refresh from Spotify" reloads it now.
 */
function SpotifyTab() {
  const router = useRouter();
  const [request, setRequest] = useState({ key: 0, refresh: false });
  const [result, setResult] = useState<Loaded | null>(null);

  useEffect(() => {
    let ignore = false;
    const url = `/api/library/sources${request.refresh ? "?refresh=1" : ""}`;
    fetchJson<SourcesAnswer>(url).then((r) => {
      if (ignore) return;
      if (r.status === "expired") {
        router.push("/?expired=1");
        return;
      }
      setResult(
        r.status === "error"
          ? { key: request.key, status: "error", rateLimited: r.rateLimited, retryAt: r.retryAt }
          : { key: request.key, status: "ready", data: r.data, loadedAt: Date.now() }
      );
    });
    return () => {
      ignore = true;
    };
  }, [request, router]);

  const current = result && result.key === request.key ? result : null;
  const state: LoadState = current ? current.status : "loading";
  const answer = current?.status === "ready" ? current : null;
  const trouble = current?.status === "error" ? current : null;
  const reload = (refresh: boolean) => setRequest((r) => ({ key: r.key + 1, refresh }));

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeading}>
        <div>
          <p>
            {answer
              ? answer.data.offline
                ? "Spotify isn't connected: showing your saved copy"
                : answer.data.blockedUntil
                  ? `Spotify is limiting this app until ${moment(answer.data.blockedUntil)}`
                  : `Updated from Spotify ${ago(answer.data.updatedAt, answer.loadedAt)}`
              : "From your Spotify library"}
          </p>
          <h2>Your Spotify playlists</h2>
        </div>
        {answer && answer.data.offline && (
          // Plain link: this starts Spotify auth and should not be prefetched.
          <a className={styles.syncButton} href="/api/auth/login">
            Connect Spotify
          </a>
        )}
        {answer && !answer.data.offline && !answer.data.blockedUntil && (
          <button className={styles.syncButton} onClick={() => reload(true)}>
            <RefreshIcon />
            Refresh from Spotify
          </button>
        )}
      </div>

      {/* Spotify asks for its logo wherever its songs and covers show (official file, black on light). */}
      <p className={styles.credit}>
        <Image src="/spotify-logo-black.svg" alt="Spotify" width={88} height={24} />
        Songs and playlists from your Spotify library.
      </p>

      {state === "loading" && <p className={styles.hint}>Loading your playlists…</p>}

      {trouble && (
        <div className={styles.errorPanel}>
          <h2>{spotifyTrouble(trouble.rateLimited, trouble.retryAt).title}</h2>
          <p>
            We couldn&apos;t load your playlists or liked songs.{" "}
            {spotifyTrouble(trouble.rateLimited, trouble.retryAt).body}
          </p>
          <button className={styles.smallButton} onClick={() => reload(false)}>
            Retry
          </button>
        </div>
      )}

      {answer && (
        <>
          {answer.data.blockedUntil && (
            <p className={styles.hint}>
              Showing your playlists as of {ago(answer.data.updatedAt, answer.loadedAt)}.
            </p>
          )}
          {answer.data.offline && answer.data.sources.length === 0 && (
            <p className={styles.hint}>
              Nothing is saved from Spotify yet. Connect Spotify once to load your playlists.
            </p>
          )}
          <div className={styles.cards}>
            {answer.data.sources.map((source) => (
              <Link key={source.id} href={playlistHref(source.id)} className={styles.card}>
                <span
                  className={`${styles.cardCover} ${source.cover ? "" : styles[`tile_${source.kind}`]}`}
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
          <p className={styles.note}>
            Only playlists you own are listed. Spotify doesn&apos;t let apps read the songs of
            playlists you just follow (like Discover Weekly).
          </p>
        </>
      )}
    </section>
  );
}
