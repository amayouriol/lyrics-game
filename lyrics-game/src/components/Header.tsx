"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/session";
import { ArrowIcon, ChevronIcon, PersonIcon } from "./icons";
import { LyricDropLogo } from "./LyricDropLogo";
import styles from "./Header.module.css";

/** "Jane Doe" → "JD"; one word → its first letter. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => [...word][0].toUpperCase())
    .join("");
}

export function Header({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Home", active: pathname === "/" },
    { href: "/library", label: "Library", active: pathname.startsWith("/library") },
    { href: "/how-to-play", label: "How to play", active: pathname === "/how-to-play" },
  ];

  const [open, setOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // The menu closes on a click anywhere else, or Esc.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!accountRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const { name, picture } = profile;

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="Lyric Drop home">
        <LyricDropLogo />
      </Link>
      <nav className={styles.nav} aria-label="Main navigation">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles.navLink} ${link.active ? styles.active : ""}`}
            aria-current={link.active ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className={styles.account} ref={accountRef}>
        <button
          type="button"
          className={styles.profileButton}
          aria-label={name ? `Open ${name}'s menu` : "Open your menu"}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((value) => !value)}
        >
          <span
            className={styles.avatar}
            style={picture ? { backgroundImage: `url(${picture})` } : undefined}
          >
            {!picture && (name ? initials(name) : <PersonIcon />)}
          </span>
          <i className={styles.chevron}>
            <ChevronIcon />
          </i>
        </button>
        {open && (
          <div className={styles.menu} role="menu">
            <div className={styles.who}>
              {name && <span className={styles.name}>{name}</span>}
              <span className={styles.plan}>Spotify Premium</span>
            </div>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" role="menuitem" className={styles.menuItem}>
                Log out
                <ArrowIcon />
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
