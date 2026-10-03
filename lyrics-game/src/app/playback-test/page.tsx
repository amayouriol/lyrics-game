import { redirect } from "next/navigation";
import { getSession, hasActiveSession } from "@/lib/session";
import { Header } from "@/components/Header";
import { PlaybackTest } from "./PlaybackTest";

// Throwaway feasibility test for Phase 3: delete once real playback is built.
export default async function PlaybackTestPage() {
  const session = await getSession();
  if (!hasActiveSession(session)) {
    redirect("/");
  }
  return (
    <>
      <Header />
      <PlaybackTest />
    </>
  );
}
