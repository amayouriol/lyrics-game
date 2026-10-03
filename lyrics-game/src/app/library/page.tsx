import { redirect } from "next/navigation";
import { getSession, hasActiveSession } from "@/lib/session";
import { Header } from "@/components/Header";
import { LibraryClient } from "./LibraryClient";

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
      <LibraryClient initialSource={source ?? null} />
    </>
  );
}
