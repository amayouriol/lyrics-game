"use client";

import { useCallback, useEffect, useState } from "react";
import type { VideoCandidate } from "@/lib/youtube";
import { VideoChoices } from "./song/[trackId]/VideoChoices";
import { guessRegion, SEARCH_ERRORS } from "./song/[trackId]/VideoPicker";
import styles from "./library.module.css";

const ADD_ERRORS: Record<string, string> = {
  ...SEARCH_ERRORS,
  not_a_youtube_link: "That doesn't look like a YouTube link.",
  not_found: "We couldn't find that. A playlist has to be public or unlisted.",
  video_not_found: "We couldn't find that video.",
  not_playable: "YouTube won't let this video play here. Try another one.",
  list_not_found: "That list isn't there any more. Reload the page.",
  session_expired: "Your session ended. Log in again.",
};

interface AddAnswer {
  kind: "song" | "playlist";
  name?: string;
  track?: { title: string; artist: string };
  added: number | boolean;
  alreadyThere?: number;
  skipped?: number;
  tooLong?: boolean;
}

/** What to tell you after something was added. */
function describe(answer: AddAnswer): string {
  if (answer.kind === "song") {
    const who = `“${answer.track?.title}” by ${answer.track?.artist}`;
    return answer.added ? `Added ${who}.` : `${who} was already in your library.`;
  }
  const count = Number(answer.added);
  const parts = [
    count === 0
      ? `Nothing new in “${answer.name}”.`
      : `Added ${count} ${count === 1 ? "song" : "songs"} from “${answer.name}”.`,
  ];
  if (answer.alreadyThere) parts.push(`${answer.alreadyThere} were already there.`);
  if (answer.skipped) parts.push(`${answer.skipped} can't be played here and were left out.`);
  if (answer.tooLong) parts.push("Only the first 200 songs were read.");
  return parts.join(" ");
}

/** Whether what was typed is a YouTube address (to add) rather than words to search for. */
export function looksLikeLink(text: string): boolean {
  return /^\s*(https?:\/\/|www\.)|youtu\.be\/|youtube\.com\//i.test(text);
}

type Message = { kind: "ok" | "error"; text: string } | null;

/**
 * The one place to add songs: type a song (and artist) to search YouTube and
 * pick one of three videos, or paste a YouTube address (a video adds one song,
 * a public or unlisted playlist adds all its songs). `listId` puts a single
 * song in that list too. `first` is the bigger welcome for an empty library.
 */
export function AddFromYouTube({
  onAdded,
  listId,
  first = false,
}: {
  onAdded: () => void;
  listId?: string;
  first?: boolean;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"link" | "search" | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [videos, setVideos] = useState<VideoCandidate[] | null>(null);
  /** Searches left today in the web version; null when there is no limit or it isn't known. */
  const [left, setLeft] = useState<number | null>(null);

  const refreshLeft = useCallback(() => {
    fetch("/api/own/limits")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setLeft(typeof body?.search === "number" ? body.search : null))
      .catch(() => {});
  }, []);
  useEffect(refreshLeft, [refreshLeft]);

  const isLink = looksLikeLink(text);
  const outOfSearches = left === 0;

  const send = async (body: Record<string, unknown>): Promise<AddAnswer> => {
    const res = await fetch("/api/own/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, region: guessRegion(), ...(listId ? { listId } : {}) }),
    });
    const answer = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(ADD_ERRORS[answer.error] ?? "Something went wrong. Try again.");
    return answer;
  };

  const addLink = async () => {
    setBusy("link");
    setMessage(null);
    setVideos(null);
    try {
      const answer = await send({ link: text.trim() });
      setMessage({ kind: "ok", text: describe(answer) });
      setText("");
      onAdded();
    } catch (error) {
      setMessage({ kind: "error", text: (error as Error).message });
    } finally {
      setBusy(null);
      refreshLeft();
    }
  };

  const search = async () => {
    setBusy("search");
    setMessage(null);
    setVideos(null);
    const query = new URLSearchParams({ title: text.trim(), artist: "" });
    const region = guessRegion();
    if (region) query.set("region", region);
    try {
      const res = await fetch(`/api/own/search?${query}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(ADD_ERRORS[body.error] ?? ADD_ERRORS.failed);
      setVideos(body.videos);
    } catch (error) {
      setMessage({ kind: "error", text: (error as Error).message });
    } finally {
      setBusy(null);
      refreshLeft();
    }
  };

  const submit = () => {
    if (!text.trim() || busy) return;
    if (isLink) addLink();
    else if (!outOfSearches) search();
  };

  // Called by the list once the video has been checked to play here.
  const addVideo = async (video: VideoCandidate) => {
    const answer = await send({ videoId: video.videoId });
    setMessage({ kind: "ok", text: describe(answer) });
    setVideos(null);
    setText("");
    onAdded();
  };

  return (
    <div className={`${styles.addBox} ${first ? styles.addFirst : ""}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h3>{first ? "Add your first song" : listId ? "Add a song to this list" : "Add a song"}</h3>
        <p>
          {first
            ? "Type a song name, or paste a YouTube link. Pick the video, then play it and fill in the missing words."
            : listId
              ? "Type a song name (and the artist), or paste a YouTube video link. The song goes into your library and into this list. A playlist link makes its own list instead."
              : "Type a song name (and the artist), or paste a YouTube link. A video adds one song; a public or unlisted playlist adds all its songs, up to 200."}
        </p>
        <div className={styles.addRow}>
          <input
            className={styles.addInput}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Song name and artist, or a YouTube link"
            aria-label="Song name and artist, or a YouTube link"
            autoComplete="off"
          />
          <button
            className={styles.smallButton}
            type="submit"
            disabled={busy !== null || !text.trim() || (!isLink && outOfSearches)}
          >
            {busy === "link" ? "Adding…" : busy === "search" ? "Searching…" : isLink ? "Add" : "Find videos"}
          </button>
        </div>
        {left !== null && (
          <small className={styles.addLeft}>
            {left === 0
              ? "You've used today's searches. Come back tomorrow, or paste a video link, which doesn't use one."
              : `${left} ${left === 1 ? "search" : "searches"} left today. Pasting a video link doesn't use one.`}
          </small>
        )}
      </form>

      {videos && (
        <div className={styles.addResults}>
          <VideoChoices videos={videos} onChosen={addVideo} />
        </div>
      )}

      {message && (
        <p className={message.kind === "error" ? styles.addError : styles.addMessage} role="status">
          {message.text}
        </p>
      )}
    </div>
  );
}
