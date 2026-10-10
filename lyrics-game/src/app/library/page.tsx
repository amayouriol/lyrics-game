import { redirect } from "next/navigation";
import { getProfile, getSession, hasActiveSession } from "@/lib/session";
import { Header } from "@/components/Header";
import { LibraryHome, type LibraryTab } from "./LibraryHome";
import { PlaylistClient } from "./PlaylistClient";
import { SavedPanel } from "./SavedPanel";
import { SavedProvider } from "./SavedProvider";

/**
 * `/library`: search and two tabs, Saved in Lyric Drop (Favorites, Play
 * later) and From Spotify (your lists as cards; `?tab=spotify`).
 * `/library?source=…`: one list's songs, with Favorites and Play later in a
 * side panel.
 */
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; tab?: string }>;
}) {
  const session = await getSession();
  if (!hasActiveSession(session)) {
    redirect("/");
  }

  const { source, tab } = await searchParams;
  const initialTab: LibraryTab = tab === "spotify" ? "spotify" : "saved";

  return (
    <>
      <Header profile={getProfile(session)} />
      <SavedProvider>
        {source ? (
          <PlaylistClient key={source} source={source} sidebar={<SavedPanel />} />
        ) : (
          <LibraryHome initialTab={initialTab} />
        )}
      </SavedProvider>
    </>
  );
}
