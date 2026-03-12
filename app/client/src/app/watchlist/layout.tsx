import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Watchlist",
  description: "Private local watchlist for tracked players.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function WatchlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
