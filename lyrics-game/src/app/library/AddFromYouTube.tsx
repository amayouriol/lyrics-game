"use client";

import { useState } from "react";
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
    return answer.added ? `Added ${who}.` : `${who} was already in your list.`;
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

type Message = { kind: "ok" | "error"; text: string } | null;

/**
 * Two ways to add songs from YouTube: paste an address (one video, or a whole
 * public or unlisted playlist), or type a title and artist and pick a video.
 */
export function AddFromYouTube({ onAdded }: { onAdded: () => void }) {
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [busy, setBusy] = useState<"link" | "search" | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [videos, setVideos] = useState<VideoCandidate[] | null>(null);

  const send = async (body: Record<string, unknown>): Promise<AddAnswer> => {
    const res = await fetch("/api/own/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, region: guessRegion() }),
    });
    const answer = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(ADD_ERRORS[answer.error] ?? "Something went wrong. Try again.");
    return answer;
  };

  const addLink = async () => {
    if (!link.trim() || busy) return;
    setBusy("link");
    setMessage(null);
    try {
      const answer = await send({ link: link.trim() });
      setMessage({ kind: "ok", text: describe(answer) });
      setLink("");
      onAdded();
    } catch (error) {
      setMessage({ kind: "error", text: (error as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const search = async () => {
    if (!title.trim() || busy) return;
    setBusy("search");
    setMessage(null);
    setVideos(null);
    const query = new URLSearchParams({ title: title.trim(), artist: artist.trim() });
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
    }
  };

  // Called by the list once the video has been checked to play here.
  const addVideo = async (video: VideoCandidate) => {
    const answer = await send({ videoId: video.videoId });
    setMessage({ kind: "ok", text: describe(answer) });
    setVideos(null);
    setTitle("");
    setArtist("");
    onAdded();
  };

  return (
    <div className={styles.addBox}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addLink();
        }}
      >
        <h3>Paste a YouTube link</h3>
        <p>A video adds one song. A public or unlisted playlist adds all its songs (up to 200).</p>
        <div className={styles.addRow}>
          <input
            className={styles.addInput}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            aria-label="YouTube link"
          />
          <button className={styles.smallButton} type="submit" disabled={busy !== null || !link.trim()}>
            {busy === "link" ? "Adding…" : "Add"}
          </button>
        </div>
      </form>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <h3>Or search by title and artist</h3>
        <p>You pick the video from three results. It&apos;s checked before it&apos;s added.</p>
        <div className={styles.addRow}>
          <input
            className={styles.addInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Song title"
            aria-label="Song title"
          />
          <input
            className={styles.addInput}
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Artist"
            aria-label="Artist"
          />
          <button className={styles.smallButton} type="submit" disabled={busy !== null || !title.trim()}>
            {busy === "search" ? "Searching…" : "Find videos"}
          </button>
        </div>
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
