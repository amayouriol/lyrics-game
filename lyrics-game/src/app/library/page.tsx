import { redirect } from "next/navigation";
import { getSession, hasActiveSession } from "@/lib/session";
import { Header } from "@/components/Header";
import { CardsClient } from "./CardsClient";
import { PlaylistClient } from "./PlaylistClient";
import { SavedPanel } from "./SavedPanel";
import { SavedProvider } from "./SavedProvider";
import styles from "./library.module.css";

/**
 * `/library`: your Spotify lists as cards. `/library?source=…`: one list's
 * songs. Both with Favorites and Play later in a side panel.
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
      <Header />
      <SavedProvider>
        <div className={styles.layout}>
          {source ? <PlaylistClient key={source} source={source} /> : <CardsClient />}
          <SavedPanel />
        </div>
      </SavedProvider>
    </>
  );
}
