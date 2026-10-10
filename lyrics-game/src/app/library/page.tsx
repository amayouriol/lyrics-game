import { redirect } from "next/navigation";
import { getProfile, getSession, hasActiveSession } from "@/lib/session";
import { Header } from "@/components/Header";
import { CardsClient } from "./CardsClient";
import { PlaylistClient } from "./PlaylistClient";
import { SavedPanel } from "./SavedPanel";
import { SavedProvider } from "./SavedProvider";
import styles from "./library.module.css";

/**
 * `/library`: the main page (Favorites, Play later, song of the day, your
 * Spotify lists as cards, search on the right). `/library?source=…`: one
 * list's songs, with Favorites and Play later in a side panel.
 */
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const session = await getSession();
  if (!hasActiveSession(session)) {
    redirect("/");
  }

  const { source } = await searchParams;

  return (
    <>
      <Header profile={getProfile(session)} />
      <SavedProvider>
        {source ? (
          <div className={styles.layout}>
            <PlaylistClient key={source} source={source} />
            <SavedPanel />
          </div>
        ) : (
          <CardsClient />
        )}
      </SavedProvider>
    </>
  );
}
