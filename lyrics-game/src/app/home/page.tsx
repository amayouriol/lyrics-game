import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { isWebMode } from "@/lib/app-mode";
import { currentProfile, getSession } from "@/lib/session";
import { HomeClient } from "../HomeClient";

export const dynamic = "force-dynamic";

/** The web version's home (your own copy has it at "/"). */
export default async function WebHomePage() {
  if (!isWebMode()) notFound();
  const profile = await currentProfile(await getSession());
  return (
    <>
      <Header profile={profile} />
      <HomeClient name={profile.name} />
    </>
  );
}
