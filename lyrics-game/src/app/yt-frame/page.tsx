"use client";

import { useEffect, useRef } from "react";
import {
  FRAME_TAG,
  hideCaptions,
  isLoopbackHost,
  loadYouTubeApi,
  type YTPlayer,
} from "../library/song/[trackId]/play/youtubeApi";

/**
 * YouTube's player inside a page of its own, served from "localhost". The
 * game page at 127.0.0.1 shows this page in a frame and talks to it by
 * messages (see createPlayer in youtubeApi.ts), because YouTube won't play on
 * a page whose address is a number. It only answers the page that opened it.
 */
export default function YouTubeFrame() {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const videoId = params.get("v") ?? "";
    const parentOrigin = params.get("parent") ?? "";
    let parentHost = "";
    try {
      const url = new URL(parentOrigin);
      if (url.origin === parentOrigin) parentHost = url.hostname;
    } catch {
      // Not an address.
    }
    // Only the app's own page (on this machine) may use this frame.
    if (!/^[\w-]{11}$/.test(videoId) || !isLoopbackHost(parentHost) || window.parent === window) return;

    let cancelled = false;
    let player: YTPlayer | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    const post = (message: Record<string, unknown>) =>
      window.parent.postMessage({ source: FRAME_TAG, ...message }, parentOrigin);
    let captionsOff = false;
    const pushState = () => {
      if (!player) return;
      // The captions module can load again once the video starts.
      if (!captionsOff && player.getPlayerState() === 1) {
        captionsOff = true;
        hideCaptions(player);
      }
      post({
        type: "state",
        state: player.getPlayerState(),
        time: player.getCurrentTime(),
        duration: player.getDuration(),
        videoId: player.getVideoData()?.video_id ?? "",
      });
    };

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== parentOrigin || e.source !== window.parent) return;
      if (e.data?.source !== FRAME_TAG) return;
      if (e.data.cmd === "play") player?.playVideo();
      else if (e.data.cmd === "pause") player?.pauseVideo();
    };
    window.addEventListener("message", onMessage);

    loadYouTubeApi().then((YT) => {
      if (cancelled || !box.current) return;
      // YouTube's script swaps this element for its player.
      const slot = document.createElement("div");
      box.current.appendChild(slot);
      player = new YT.Player(slot, {
        width: window.innerWidth,
        height: window.innerHeight,
        videoId,
        playerVars: {
          autoplay: Number(params.get("autoplay") ?? 0),
          controls: Number(params.get("controls") ?? 0),
          disablekb: 1,
          fs: 0,
          playsinline: 1,
          rel: 0,
          cc_load_policy: 0,
          iv_load_policy: 3,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            hideCaptions(e.target);
            post({ type: "ready" });
            timer = setInterval(pushState, 100);
          },
          onStateChange: pushState,
          onError: (e) => post({ type: "error", code: e.data }),
          onAutoplayBlocked: () => post({ type: "autoplay-blocked" }),
        },
      });
    });

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("message", onMessage);
      try {
        player?.destroy();
      } catch {
        // Not finished loading.
      }
    };
  }, []);

  return (
    <div
      ref={box}
      style={{ position: "fixed", inset: 0, margin: 0, background: "#000", overflow: "hidden" }}
    />
  );
}
