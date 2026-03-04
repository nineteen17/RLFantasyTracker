import { useState } from "react";
import Link from "next/link";
import type { PlayerCard } from "@nrl/types";
import { PositionBadge } from "@/components/position-badge";
import { StatusBadge } from "@/components/status-badge";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { formatPrice, formatNumber, formatPercent } from "@/lib/utils";

interface RosterGridProps {
  roster: PlayerCard[];
  squadId: number;
}

type SortField = "name" | "price" | "avg" | "base" | "owned" | "ppm";

export function RosterGrid({ roster, squadId }: RosterGridProps) {
  const [sortField, setSortField] = useState<SortField>("avg");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const sortedRoster = [...roster].sort((a, b) => {
    let aVal: number | string = 0;
    let bVal: number | string = 0;

    switch (sortField) {
      case "name":
        aVal = a.fullName;
        bVal = b.fullName;
        break;
      case "price":
        aVal = a.cost;
        bVal = b.cost;
        break;
      case "avg":
        aVal = Number.parseFloat(a.current?.avgPoints ?? "0");
        bVal = Number.parseFloat(b.current?.avgPoints ?? "0");
        break;
      case "owned":
        aVal = Number.parseFloat(a.current?.ownedBy ?? "0");
        bVal = Number.parseFloat(b.current?.ownedBy ?? "0");
        break;
      case "base":
        aVal = Number.parseFloat(a.current?.baseAvg ?? "0");
        bVal = Number.parseFloat(b.current?.baseAvg ?? "0");
        break;
      case "ppm":
        aVal = Number.parseFloat(a.current?.ppmSeason ?? "0");
        bVal = Number.parseFloat(b.current?.ppmSeason ?? "0");
        break;
    }

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortOrder === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    const aNum = aVal as number;
    const bNum = bVal as number;
    return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Roster</h2>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => handleSort("avg")}
            className={`rounded px-3 py-1 ${sortField === "avg" ? "bg-accent/15 text-accent-light" : "bg-surface-alt"}`}
          >
            Avg {sortField === "avg" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>
          <button
            type="button"
            onClick={() => handleSort("base")}
            className={`rounded px-3 py-1 ${sortField === "base" ? "bg-accent/15 text-accent-light" : "bg-surface-alt"}`}
          >
            Base {sortField === "base" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>
          <button
            type="button"
            onClick={() => handleSort("ppm")}
            className={`rounded px-3 py-1 ${sortField === "ppm" ? "bg-accent/15 text-accent-light" : "bg-surface-alt"}`}
          >
            PPM {sortField === "ppm" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>
          <button
            type="button"
            onClick={() => handleSort("price")}
            className={`rounded px-3 py-1 ${sortField === "price" ? "bg-accent/15 text-accent-light" : "bg-surface-alt"}`}
          >
            Price {sortField === "price" && (sortOrder === "asc" ? "↑" : "↓")}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedRoster.map((player) => (
          <Link
            key={player.playerId}
            href={`/players/${player.playerId}?returnTo=/teams/${squadId}`}
            className="rounded-lg border border-border bg-surface p-4 transition hover:border-border-hover hover:shadow-lg hover:shadow-accent/10"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1">
                <PlayerAvatar playerId={player.playerId} name={player.fullName} />
                <div>
                  <h3 className="font-semibold">{player.fullName}</h3>
                  {player.status && (
                    <StatusBadge status={player.status} showLabel />
                  )}
                </div>
              </div>
              <span className="text-sm font-medium">
                {formatPrice(player.cost)}
              </span>
            </div>

            <div className="mt-2">
              <PositionBadge positions={player.positions} />
            </div>

            {player.current && (
              <div className="mt-3 grid grid-cols-4 gap-2 text-sm">
                <div>
                  <div className="text-xs text-muted">Avg</div>
                  <div className="font-medium">
                    {formatNumber(player.current.avgPoints)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Base</div>
                  <div className="font-medium">
                    {formatNumber(player.current.baseAvg)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Owned</div>
                  <div className="font-medium">
                    {formatPercent(player.current.ownedBy)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">PPM</div>
                  <div className="font-medium">
                    {formatNumber(player.current.ppmSeason)}
                  </div>
                </div>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
