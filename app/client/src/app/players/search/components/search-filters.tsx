"use client";

import { useMemo } from "react";
import { useTeams } from "@/hooks/api/use-teams";
import { POSITION_OPTIONS } from "@/lib/constants";
import { STATUS_OPTIONS } from "@/components/status-badge";
import type { SearchQuery } from "@nrl/types";

interface SearchFiltersProps {
  squadId?: number;
  position?: number;
  status?: string;
  onFilterChange: (updates: Partial<SearchQuery>) => void;
}

const selectClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-inherit focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

export function SearchFilters({
  squadId,
  position,
  status,
  onFilterChange,
}: SearchFiltersProps) {
  const { data: teamsData } = useTeams();
  const teams = useMemo(
    () => [...(teamsData?.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [teamsData?.data],
  );

  const activeCount = [squadId, position, status].filter(
    (value) => value !== undefined && value !== "",
  ).length;

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <select
        value={squadId ?? ""}
        onChange={(e) =>
          onFilterChange({
            squad_id: e.target.value ? Number(e.target.value) : undefined,
          })
        }
        className={selectClass}
      >
        <option value="">All Teams</option>
        {teams.map((team) => (
          <option key={team.squadId} value={team.squadId}>
            {team.name}
          </option>
        ))}
      </select>

      <select
        value={position ?? ""}
        onChange={(e) =>
          onFilterChange({
            position: e.target.value ? Number(e.target.value) : undefined,
          })
        }
        className={selectClass}
      >
        <option value="">All Positions</option>
        {POSITION_OPTIONS.map((pos) => (
          <option key={pos.value} value={pos.value}>
            {pos.label}
          </option>
        ))}
      </select>

      <select
        value={status ?? ""}
        onChange={(e) =>
          onFilterChange({
            status: e.target.value || undefined,
          })
        }
        className={selectClass}
      >
        <option value="">All Statuses</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() =>
          onFilterChange({
            squad_id: undefined,
            position: undefined,
            status: undefined,
          })
        }
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        disabled={activeCount === 0}
      >
        Clear all
      </button>
    </div>
  );
}
