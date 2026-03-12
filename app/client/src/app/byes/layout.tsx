import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NRL Fantasy Bye Planner",
  description: "Plan NRL Fantasy bye rounds by team with a season bye matrix.",
  alternates: {
    canonical: "/byes",
  },
};

export default function ByesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
