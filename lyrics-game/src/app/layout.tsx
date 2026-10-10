import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lyrics Game",
  description: "Sing along and fill in the missing words in songs from your Spotify library.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- root layout, so this is global, not per-page */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600&family=Iosevka+Charon:ital,wght@0,300;0,400;0,500;0,700;1,400&family=Iosevka+Charon+Mono:wght@400;500;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
