"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { listIdOf, sendList } from "./listApi";
import styles from "./library.module.css";

/**
 * Rename and delete, on the page of one of your lists. "Added songs" can be
 * renamed but not deleted. Deleting asks first, and says the songs stay.
 */
export function ListActions({
  source,
  name,
  onRenamed,
}: {
  /** The list's source id, "own:…". */
  source: string;
  name: string;
  onRenamed: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "rename" | "delete">("idle");
  const [draft, setDraft] = useState(name);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const url = `/api/own/lists/${listIdOf(source)}`;
  const canDelete = source !== "own:added";

  const reset = () => {
    setMode("idle");
    setProblem(null);
  };

  const rename = async () => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    const answer = await sendList(url, "PATCH", { name: draft });
    setBusy(false);
    if (!answer.ok) {
      setProblem(answer.message);
      return;
    }
    reset();
    onRenamed();
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    const answer = await sendList(url, "DELETE");
    if (!answer.ok) {
      setBusy(false);
      setProblem(answer.message);
      return;
    }
    router.push("/library");
  };

  return (
    <div className={styles.listActions}>
      {mode === "idle" && (
        <>
          <button
            className={styles.ghostButton}
            onClick={() => {
              setDraft(name);
              setMode("rename");
            }}
          >
            Rename
          </button>
          {canDelete && (
            <button className={styles.ghostButton} onClick={() => setMode("delete")}>
              Delete list
            </button>
          )}
        </>
      )}

      {mode === "rename" && (
        <form
          className={styles.listForm}
          onSubmit={(e) => {
            e.preventDefault();
            rename();
          }}
        >
          <div className={styles.addRow}>
            <input
              className={styles.addInput}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="New name for this list"
              maxLength={60}
              autoFocus
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Escape") reset();
              }}
            />
            <button className={styles.smallButton} type="submit" disabled={busy || !draft.trim()}>
              {busy ? "Saving…" : "Save name"}
            </button>
            <button className={styles.ghostLink} type="button" onClick={reset}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === "delete" && (
        <div className={styles.confirm} role="alertdialog" aria-label={`Delete ${name}?`}>
          <span>
            Delete “{name}”? The songs stay in your library, and in your other lists.
          </span>
          <button className={styles.smallButton} onClick={remove} disabled={busy}>
            {busy ? "Deleting…" : "Delete"}
          </button>
          <button className={styles.ghostLink} onClick={reset}>
            Cancel
          </button>
        </div>
      )}

      {problem && (
        <p className={styles.listProblem} role="status">
          {problem}
        </p>
      )}
    </div>
  );
}
