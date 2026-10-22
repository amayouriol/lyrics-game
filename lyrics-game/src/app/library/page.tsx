import { redirect } from "next/navigation";
import { isWebMode } from "@/lib/app-mode";
import { currentProfile, getSession, hasAccess } from "@/lib/session";
import { Header } from "@/components/Header";
import { LibraryHome, type LibraryTab } from "./LibraryHome";
import { PlaylistClient } from "./PlaylistClient";
import { SavedPanel } from "./SavedPanel";
import { SavedProvider } from "./SavedProvider";

/**
 * `/library`: the box for adding songs, a search, and tabs: Your lists (what
 * you added from YouTube), Saved in Lyric Drop (Favorites, Play later;
 * `?tab=saved`) and, in your own copy, From Spotify (`?tab=spotify`).
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
  const web = isWebMode();
  // "youtube" is the old name of the lists tab, kept so old links still open it.
  const initialTab: LibraryTab = tab === "saved" || (tab === "spotify" && !web) ? tab : "lists";

  return (
    <>
      <Header profile={profile} />
      <SavedProvider>
        {source ? (
          <PlaylistClient key={source} source={source} sidebar={<SavedPanel />} />
        ) : (
          <LibraryHome initialTab={initialTab} web={web} />
        )}
      </SavedProvider>
    </>
  );
}
