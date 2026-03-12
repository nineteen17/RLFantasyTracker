import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NRL Live Scores and Fantasy Match Centre",
  description:
    "Track NRL live match scores, fixtures, and fantasy stat impact in real time.",
};

export default function LiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
