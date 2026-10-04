"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Home", active: pathname === "/" },
    { href: "/library", label: "Library", active: pathname.startsWith("/library") },
  ];

  return (
    <header className="app-header">
      <Link href="/" className="app-header__logo">
        Lyrics Game
      </Link>
      <nav className="app-header__nav">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`app-header__link${link.active ? " app-header__link--active" : ""}`}
            aria-current={link.active ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="app-header__spacer" />
      <span className="chip chip--quaternary chip--sm">Spotify Premium</span>
      <form action="/api/auth/logout" method="POST">
        <button type="submit" className="btn btn--ghost btn--sm">
          Log out
        </button>
      </form>
    </header>
  );
}
