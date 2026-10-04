"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { SavedLists } from "@/lib/saved";
import { fetchJson } from "./libraryData";

interface SavedState {
  /** null while loading. */
  lists: SavedLists | null;
  failed: boolean;
  reload: () => void;
}

const SavedContext = createContext<SavedState>({ lists: null, failed: false, reload: () => {} });

/** Your Favorites and Play later, shared by the library's side panel and song buttons. */
export function SavedProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [reloadKey, setReloadKey] = useState(0);
  const [loaded, setLoaded] = useState<{ key: number; lists: SavedLists | null } | null>(null);

  useEffect(() => {
    let ignore = false;
    fetchJson<SavedLists>("/api/saved").then((r) => {
      if (ignore) return;
      if (r.status === "expired") {
        router.push("/?expired=1");
        return;
      }
      setLoaded({ key: reloadKey, lists: r.status === "ok" ? r.data : null });
    });
    return () => {
      ignore = true;
    };
  }, [reloadKey, router]);

  const current = loaded?.key === reloadKey ? loaded : null;
  return (
    <SavedContext.Provider
      value={{
        lists: current?.lists ?? null,
        failed: Boolean(current && !current.lists),
        reload: () => setReloadKey((k) => k + 1),
      }}
    >
      {children}
    </SavedContext.Provider>
  );
}

export function useSaved(): SavedState {
  return useContext(SavedContext);
}
