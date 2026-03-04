"use client";

import { useState } from "react";
import type { PlayerCurrent } from "@nrl/types";

interface SplitsTableProps {
  current: PlayerCurrent;
  teamNames: Record<string, string>;
  venueNames: Record<string, string>;
}

function CollapsibleCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-6 text-left"
      >
        <h2 className="text-xl font-bold">{title}</h2>
        <span className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}>
          &#9662;
        </span>
      </button>
      {open && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

export function SplitsTable({
  current,
  teamNames,
  venueNames,
}: SplitsTableProps) {
  const opponents = current.opponents as Record<string, number> | null;
  const venues = current.venuesSplit as Record<string, number> | null;

  const hasOpponents = opponents && Object.keys(opponents).length > 0;
  const hasVenues = venues && Object.keys(venues).length > 0;

  if (!hasOpponents && !hasVenues) return null;

  return (
    <div className="space-y-4">
      {hasOpponents && (
        <CollapsibleCard title="Opponent Splits">
          <div className="overflow-x-auto">
            <table className="w-full text-sm md:text-base">
              <thead className="border-b border-border">
                <tr>
                  <th className="pb-2 text-left">Opponent</th>
                  <th className="pb-2 text-right">Avg Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Object.entries(opponents)
                  .sort(([, a], [, b]) => b - a)
                  .map(([oppId, score]) => (
                    <tr key={oppId}>
                      <td className="py-2">
                        {teamNames[oppId] ?? `Squad ${oppId}`}
                      </td>
                      <td className="py-2 text-right">{score}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CollapsibleCard>
      )}

      {hasVenues && (
        <CollapsibleCard title="Venue Splits">
          <div className="overflow-x-auto">
            <table className="w-full text-sm md:text-base">
              <thead className="border-b border-border">
                <tr>
                  <th className="pb-2 text-left">Venue</th>
                  <th className="pb-2 text-right">Avg Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Object.entries(venues)
                  .sort(([, a], [, b]) => b - a)
                  .map(([venueId, score]) => (
                    <tr key={venueId}>
                      <td className="py-2">
                        {venueNames[venueId] ?? `Venue ${venueId}`}
                      </td>
                      <td className="py-2 text-right">{score}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CollapsibleCard>
      )}
    </div>
  );
}
