/** Outline icons, drawn with the current text color. `filled` fills them in. */

export function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill={filled ? "currentColor" : "none"}>
      <path d="M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z" />
    </svg>
  );
}

export function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill={filled ? "currentColor" : "none"}>
      <path d="M7 3.5h10a1 1 0 0 1 1 1v16l-6-4-6 4v-16a1 1 0 0 1 1-1z" />
    </svg>
  );
}

export function NoteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M9 18.5a2.5 2.5 0 1 1-2.5-2.5H9V5l11-2v13a2.5 2.5 0 1 1-2.5-2.5H20" />
    </svg>
  );
}
