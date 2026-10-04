import { redirect } from "next/navigation";
import { getSession, hasActiveSession } from "@/lib/session";
import { Header } from "@/components/Header";
import { CardsClient } from "./CardsClient";
import { PlaylistClient } from "./PlaylistClient";

/** `/library`: every list as a card. `/library?source=…`: one list's songs. */
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
      {source ? <PlaylistClient key={source} source={source} /> : <CardsClient />}
    </>
  );
}
