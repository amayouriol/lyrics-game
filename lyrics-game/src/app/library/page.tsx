import { redirect } from "next/navigation";
import { currentProfile, getSession, hasAccess } from "@/lib/session";
import { Header } from "@/components/Header";
import { LibraryHome, type LibraryTab } from "./LibraryHome";
import { PlaylistClient } from "./PlaylistClient";
import { SavedPanel } from "./SavedPanel";
import { SavedProvider } from "./SavedProvider";

/**
 * `/library`: search and three tabs, Saved in Lyric Drop (Favorites, Play
 * later), From Spotify (your lists as cards; `?tab=spotify`) and From
 * YouTube (added songs and playlists; `?tab=youtube`).
 * `/library?source=…`: one list's songs, with Favorites and Play later in a
 * side panel.
 */
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; tab?: string }>;
}) {
  const session = await getSession();
  if (!(await hasAccess(session))) {
    redirect("/");
  }
  const profile = await currentProfile(session);

  const { source, tab } = await searchParams;
  const initialTab: LibraryTab = tab === "spotify" || tab === "youtube" ? tab : "saved";

  return (
    <>
      <Header profile={profile} />
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
