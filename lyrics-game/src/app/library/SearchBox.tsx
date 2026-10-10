"use client";

import styles from "./library.module.css";

/** A search field for titles and artists. Dark on the library's top band, light on a list's page. */
export function SearchBox({
  value,
  onChange,
  placeholder,
  tone = "light",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  tone?: "dark" | "light";
}) {
  return (
    <div className={`${styles.search} ${tone === "dark" ? styles.searchDark : ""}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </svg>
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onChange("");
        }}
      />
    </div>
  );
}
