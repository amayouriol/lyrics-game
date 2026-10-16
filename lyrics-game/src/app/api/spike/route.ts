// Throwaway Phase 14 spike: remove once the hosting checks are done.
import { getDictionary } from "@/lib/dictionary";

export const dynamic = "force-dynamic";

async function timed<T>(run: () => Promise<T>) {
  const start = Date.now();
  try {
    return { ok: true, seconds: (Date.now() - start) / 1000, ...(await run()) };
  } catch (error) {
    return { ok: false, seconds: (Date.now() - start) / 1000, error: String(error) };
  }
}

async function upstash(command: string[]) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Upstash values are not set");
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Upstash answered ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

export async function GET(request: Request) {
  const step = new URL(request.url).searchParams.get("step");

  if (step === "words") {
    return Response.json(
      await timed(async () => {
        const isWord = await getDictionary();
        return { hello: isWord("hello"), corazon: isWord("corazón"), nonsense: isWord("zxqvv") };
      }),
    );
  }

  if (step === "search") {
    return Response.json(
      await timed(async () => {
        const key = process.env.YOUTUBE_API_KEY;
        if (!key) throw new Error("YOUTUBE_API_KEY is not set");
        const url =
          "https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=dQw4w9WgXcQ&key=" + key;
        const res = await fetch(url);
        const body = (await res.json()) as {
          items?: { snippet: { title: string }; status: { embeddable: boolean } }[];
        };
        if (!res.ok || !body.items?.length) throw new Error(`YouTube answered ${res.status}`);
        return { title: body.items[0].snippet.title, embeddable: body.items[0].status.embeddable };
      }),
    );
  }

  if (step === "redis") {
    return Response.json(
      await timed(async () => {
        const value = String(Date.now());
        await upstash(["SET", "spike:test", value]);
        const back = await upstash(["GET", "spike:test"]);
        return { wrote: value, read: back, match: back === value };
      }),
    );
  }

  return Response.json({ error: "step must be words, search or redis" }, { status: 400 });
}
