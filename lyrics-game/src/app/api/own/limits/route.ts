import { remaining } from "@/lib/limits";
import { ownUser } from "@/lib/own-access";

/** How many searches and playlist imports are left today (null: no limit, as in your own copy). */
export async function GET() {
  const who = await ownUser();
  if ("denied" in who) return who.denied;
  try {
    return Response.json({
      search: await remaining("search", who.userId),
      import: await remaining("import", who.userId),
    });
  } catch (error) {
    console.error("[/api/own/limits]", error);
    // Not knowing is fine: the add bar just shows no count.
    return Response.json({ search: null, import: null });
  }
}
