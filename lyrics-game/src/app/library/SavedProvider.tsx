"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { SavedListName, SavedLists, SavedSong } from "@/lib/saved";
import { fetchJson } from "./libraryData";

export type SongToSave = Omit<SavedSong, "addedAt">;

interface SavedState {
  /** null while loading. */
  lists: SavedLists | null;
  failed: boolean;
  reload: () => void;
  /**
   * Adds or removes a song. Shows straight away; if saving fails, it goes
   * back and this resolves false.
   */
  toggle: (list: SavedListName, song: SongToSave, on: boolean) => Promise<boolean>;
}

const SavedContext = createContext<SavedState>({
  lists: null,
  failed: false,
  reload: () => {},
  toggle: async () => false,
});

/** Your Favorites and Play later, shared by the library's side panel and song buttons. */
export function SavedProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [reloadKey, setReloadKey] = useState(0);
  const [loaded, setLoaded] = useState<{ key: number; lists: SavedLists | null } | null>(null);
  /** Changes made here, newest last, applied on top of what was loaded until saved. */
  const [pending, setPending] = useState<{ id: number; list: SavedListName; song: SongToSave; on: boolean }[]>([]);
  const nextId = useRef(0);
  /** The newest change whose answer has been applied, so a late older answer can't undo it. */
  const appliedId = useRef(-1);

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

  // What you see: the loaded lists with your unsaved changes on top.
  let lists: SavedLists | null = current?.lists ?? null;
  if (lists) {
    for (const change of pending) {
      const without: SavedSong[] = lists[change.list].filter((s) => s.id !== change.song.id);
      const next: SavedSong[] = change.on ? [{ ...change.song, addedAt: 0 }, ...without] : without;
      lists = { ...lists, [change.list]: next };
    }
  }

  async function toggle(list: SavedListName, song: SongToSave, on: boolean): Promise<boolean> {
    const id = nextId.current++;
    setPending((p) => [...p, { id, list, song, on }]);
    const r = await fetchJson<SavedLists>("/api/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ list, track: song, on }),
    });
    if (r.status === "expired") {
      router.push("/?expired=1");
      return false;
    }
    if (r.status === "ok" && id > appliedId.current) {
      // The server's answer holds every change saved up to this one.
      appliedId.current = id;
      setLoaded((l) => (l ? { ...l, lists: r.data } : l));
    }
    setPending((p) => p.filter((c) => c.id !== id));
    return r.status === "ok";
  }

  return (
    <SavedContext.Provider
      value={{
        lists,
        failed: Boolean(current && !current.lists),
        reload: () => setReloadKey((k) => k + 1),
        toggle,
      }}
    >
      {children}
    </SavedContext.Provider>
  );
}

export function useSaved(): SavedState {
  return useContext(SavedContext);
}
