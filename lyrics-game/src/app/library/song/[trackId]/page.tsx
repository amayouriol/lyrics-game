import { redirect } from "next/navigation";
import { getProfile, getSession, hasActiveSession } from "@/lib/session";
import { Header } from "@/components/Header";
import { SavedProvider } from "../../SavedProvider";
import { SongClient } from "./SongClient";

export default async function SongPage({
  params,
  searchParams,
}: {
  params: Promise<{ trackId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const session = await getSession();
  if (!hasActiveSession(session)) {
    redirect("/");
  }

  const { trackId } = await params;
  const { from } = await searchParams;

  return (
    <>
      <Header profile={getProfile(session)} />
      <SavedProvider>
        <SongClient trackId={trackId} from={from ?? null} />
      </SavedProvider>
    </>
  );
}
