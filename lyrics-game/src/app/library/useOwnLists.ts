"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { OwnSource } from "@/lib/own-library";
import { fetchJson } from "./libraryData";

type Loaded =
  | { key: number; status: "ready"; sources: OwnSource[] }
  | { key: number; status: "error" };

export interface OwnLists {
  status: "loading" | "ready" | "error";
  /** Your lists, "Added songs" and imported playlists included. Empty until loaded. */
  sources: OwnSource[];
  /** Asks again, after something was added or changed. */
  reload: () => void;
}

/** The lists in your own library (songs added from YouTube), loaded once and kept for the page. */
export function useOwnLists(): OwnLists {
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
  return {
    status: current?.status ?? "loading",
    sources: current?.status === "ready" ? current.sources : [],
    reload: () => setKey((k) => k + 1),
  };
}
