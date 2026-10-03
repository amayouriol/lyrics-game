import Link from "next/link";

export function Header() {
  return (
    <header className="app-header">
      <Link href="/library" className="app-header__logo">
        Lyrics Game
      </Link>
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
