import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { currentProfile, getSession, hasAccess } from "@/lib/session";
import { HowToPlay } from "./HowToPlay";

export default async function HowToPlayPage() {
  const session = await getSession();
  if (!(await hasAccess(session))) {
    redirect("/");
  }
  const profile = await currentProfile(session);

  return (
    <>
      <Header profile={profile} />
      <HowToPlay />
    </>
  );
}
