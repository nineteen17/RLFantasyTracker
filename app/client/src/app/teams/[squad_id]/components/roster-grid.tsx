"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PlayerCard } from "@nrl/types";
import { POSITION_LABELS } from "@/lib/constants";
import { StatusBadge } from "@/components/status-badge";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { playerPath, teamPath } from "@/lib/entity-routes";
import { formatPrice, formatNumber, formatPercent } from "@/lib/utils";

interface RosterGridProps {
  roster: PlayerCard[];
  squadId: number;
  teamName: string;
}

type SortField = "name" | "price" | "avg" | "base" | "owned" | "ppm";

const SORTABLE_COLUMNS: { field: SortField; label: string }[] = [
  { field: "price", label: "Price" },
  { field: "avg", label: "Avg" },
  { field: "base", label: "Base" },
  { field: "ppm", label: "PPM" },
  { field: "owned", label: "Own%" },
];

function toFiniteNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;

  const parsed =
    typeof value === "number" ? value : Number.parseFloat(value.trim());

  return Number.isFinite(parsed) ? parsed : null;
}

function compareNullableNumbers(
  a: number | null,
  b: number | null,
  sortOrder: "asc" | "desc",
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  return sortOrder === "asc" ? a - b : b - a;
}

function getNumericSortValue(player: PlayerCard, field: SortField): number | null {
  switch (field) {
    case "price":
      return toFiniteNumber(player.cost);
    case "avg":
      return toFiniteNumber(player.current?.avgPoints);
    case "owned":
      return toFiniteNumber(player.current?.ownedBy);
    case "base":
      return toFiniteNumber(player.current?.baseAvg);
    case "ppm":
      return toFiniteNumber(player.current?.ppmSeason);
    default:
      return null;
  }
}

function positionLabel(positions: number[]): string {
  return positions.map((p) => POSITION_LABELS[p] ?? p).join("/");
}

function SortIndicator({ active, order }: { active: boolean; order: "asc" | "desc" }) {
  if (!active) return <span className="ml-1 text-muted/30">↕</span>;
  return <span className="ml-1">{order === "asc" ? "↑" : "↓"}</span>;
}

export function RosterGrid({ roster, squadId, teamName }: RosterGridProps) {
  const [sortField, setSortField] = useState<SortField>("avg");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();

  const filteredRoster = useMemo(() => {
    if (!normalizedQuery) return roster;
    return roster.filter((player) => {
      const status = player.status?.toLowerCase() ?? "";
      const positions = positionLabel(player.positions).toLowerCase();
      return (
        player.fullName.toLowerCase().includes(normalizedQuery) ||
        status.includes(normalizedQuery) ||
        positions.includes(normalizedQuery)
      );
    });
  }, [roster, normalizedQuery]);

  const sortedRoster = useMemo(() => {
    return [...filteredRoster].sort((a, b) => {
      if (sortField === "name") {
        return sortOrder === "asc"
          ? a.fullName.localeCompare(b.fullName)
          : b.fullName.localeCompare(a.fullName);
      }

      const result = compareNullableNumbers(
        getNumericSortValue(a, sortField),
        getNumericSortValue(b, sortField),
        sortOrder,
      );

      if (result !== 0) return result;

      return a.fullName.localeCompare(b.fullName);
    });
  }, [filteredRoster, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder(field === "name" ? "asc" : "desc");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Roster</h2>
          <p className="mt-1 text-sm text-muted">
            {sortedRoster.length} of {roster.length} players
          </p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search roster..."
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted focus:border-accent-light sm:w-72 md:text-base"
        />
      </div>

      {sortedRoster.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted md:text-base">
          No players match your search.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full w-max text-sm md:text-base">
            <thead className="bg-surface-alt">
              <tr>
                <th className="relative sticky left-0 z-20 min-w-[190px] bg-surface-alt px-2 py-3 text-left text-sm font-medium text-muted after:absolute after:top-0 after:right-0 after:bottom-0 after:w-px after:bg-border md:min-w-[240px] md:px-3 md:text-base">
                  <button
                    type="button"
                    onClick={() => handleSort("name")}
                    className={`inline-flex items-center transition-colors hover:text-inherit ${
                      sortField === "name" ? "text-accent-light" : "text-muted"
                    }`}
                  >
                    Player
                    <SortIndicator active={sortField === "name"} order={sortOrder} />
                  </button>
                </th>
                {SORTABLE_COLUMNS.map((col) => (
                  <th
                    key={col.field}
                    className={`whitespace-nowrap px-2 py-3 text-right text-xs font-medium md:min-w-[72px] md:px-3 md:text-sm ${
                      sortField === col.field ? "text-accent-light" : "text-muted"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(col.field)}
                      className="inline-flex items-center transition-colors hover:text-inherit"
                    >
                      {col.label}
                      <SortIndicator active={sortField === col.field} order={sortOrder} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedRoster.map((player) => (
                <tr key={player.playerId} className="group/row hover:bg-surface-alt">
                  <td className="relative sticky left-0 z-10 min-w-[190px] bg-bg px-2 py-2 after:absolute after:top-0 after:right-0 after:bottom-0 after:w-px after:bg-border group-hover/row:bg-surface-alt md:min-w-[240px] md:px-3">
                    <div className="flex items-center gap-2">
                      <PlayerAvatar playerId={player.playerId} name={player.fullName} />
                      <div className="min-w-0 pr-1">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={player.status} />
                          <Link
                            href={`${playerPath(player.playerId, player.fullName)}?returnTo=${encodeURIComponent(teamPath(squadId, teamName))}`}
                            className="truncate font-medium text-accent-light hover:underline"
                          >
                            {player.fullName}
                          </Link>
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted md:text-sm">
                          {positionLabel(player.positions)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right md:px-3">
                    {formatPrice(player.cost)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right md:px-3">
                    {formatNumber(player.current?.avgPoints)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right md:px-3">
                    {formatNumber(player.current?.baseAvg)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right md:px-3">
                    {formatNumber(player.current?.ppmSeason)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right md:px-3">
                    {formatPercent(player.current?.ownedBy)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
