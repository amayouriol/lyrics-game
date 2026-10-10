import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { getProfile, getSession, hasActiveSession } from "@/lib/session";
import { HowToPlay } from "./HowToPlay";

export default async function HowToPlayPage() {
  const session = await getSession();
  if (!hasActiveSession(session)) {
    redirect("/");
  }

  return (
    <>
      <Header profile={getProfile(session)} />
      <HowToPlay />
    </>
  );
}
