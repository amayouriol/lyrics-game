import { redirect } from "next/navigation";
import { getSession, hasActiveSession } from "@/lib/session";
import { Header } from "@/components/Header";
import { LibraryClient } from "./LibraryClient";

export default async function LibraryPage() {
  const session = await getSession();
  if (!hasActiveSession(session)) {
    redirect("/");
  }

  return (
    <>
      <Header />
      <LibraryClient />
    </>
  );
}
