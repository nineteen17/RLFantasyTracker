import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NRL Fantasy Player Search",
  description:
    "Search and filter NRL Fantasy players by team, position, status, and value metrics.",
  alternates: {
    canonical: "/players/search",
  },
};

export default function PlayerSearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
