"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { playlistHref } from "./libraryData";
import { sendList } from "./listApi";
import styles from "./library.module.css";

/** "New list": a name, then you land in the empty list, ready to fill. */
export function NewListForm({ onMade }: { onMade: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  if (!open) {
    return (
      <button className={styles.smallButton} onClick={() => setOpen(true)}>
        New list
      </button>
    );
  }

  const close = () => {
    setOpen(false);
    setName("");
    setProblem(null);
  };

  const make = async () => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    const answer = await sendList<{ id: string }>("/api/own/lists", "POST", { name });
    setBusy(false);
    if (!answer.ok) {
      setProblem(answer.message);
      return;
    }
    onMade();
    router.push(playlistHref(answer.data.id));
  };

  return (
    <form
      className={styles.listForm}
      onSubmit={(e) => {
        e.preventDefault();
        make();
      }}
    >
      <div className={styles.addRow}>
        <input
          className={styles.addInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name of the list, for example Easy English"
          aria-label="Name of the new list"
          maxLength={60}
          autoFocus
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
        />
        <button className={styles.smallButton} type="submit" disabled={busy || !name.trim()}>
          {busy ? "Making…" : "Make list"}
        </button>
        <button className={styles.linkButton} type="button" onClick={close}>
          Cancel
        </button>
      </div>
      {problem && (
        <p className={styles.addError} role="status">
          {problem}
        </p>
      )}
    </form>
  );
}
