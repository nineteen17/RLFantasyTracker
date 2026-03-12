import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NRL Teams and Rosters",
  description:
    "Browse NRL team rosters, fixtures, and squad-level fantasy insights.",
};

export default function TeamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
