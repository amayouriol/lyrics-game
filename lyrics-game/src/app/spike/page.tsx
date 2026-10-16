// Throwaway Phase 14 spike page: remove once the hosting checks are done.
"use client";

import { useState } from "react";

export default function SpikePage() {
  const [results, setResults] = useState<Record<string, string>>({});

  async function run(step: string) {
    setResults((r) => ({ ...r, [step]: "running…" }));
    const res = await fetch(`/api/spike?step=${step}`);
    const text = JSON.stringify(await res.json(), null, 2);
    setResults((r) => ({ ...r, [step]: text }));
  }

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto", color: "#fff" }}>
      <h1>Hosting spike</h1>
      {["words", "search", "redis"].map((step) => (
        <section key={step} style={{ margin: "16px 0" }}>
          <button onClick={() => run(step)}>Test: {step}</button>
          <pre>{results[step]}</pre>
        </section>
      ))}
      <h2>Player</h2>
      <iframe
        width="356"
        height="200"
        src="https://www.youtube.com/embed/dQw4w9WgXcQ?cc_load_policy=0&playsinline=1"
        allow="autoplay; encrypted-media"
        title="Spike player"
      />
    </main>
  );
}
