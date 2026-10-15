import { redirect } from "next/navigation";
import { currentProfile, getSession, hasAccess } from "@/lib/session";
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
  if (!(await hasAccess(session))) {
    redirect("/");
  }
  const profile = await currentProfile(session);

  const { trackId } = await params;
  const { from } = await searchParams;

  return (
    <>
      <Header profile={profile} />
      <SavedProvider>
        <SongClient trackId={trackId} from={from ?? null} />
      </SavedProvider>
    </>
  );
}
