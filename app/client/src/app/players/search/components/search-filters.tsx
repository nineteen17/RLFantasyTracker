"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, X } from "lucide-react";
import { useTeams } from "@/hooks/api/use-teams";
import { POSITION_OPTIONS } from "@/lib/constants";
import { STATUS_OPTIONS } from "@/components/status-badge";
import type { SearchQuery } from "@nrl/types";

interface SearchFiltersProps {
  squadId?: number;
  position?: number;
  status?: string;
  onFilterChange: (updates: Partial<SearchQuery>) => void;
  mode?: "all" | "mobileTrigger" | "desktopControls";
}

const selectClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-inherit focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

type FilterState = {
  squadId?: number;
  position?: number;
  status?: string;
};

function countActiveFilters({ squadId, position, status }: FilterState): number {
  return [squadId, position, status].filter(
    (value) => value !== undefined && value !== "",
  ).length;
}

interface FilterControlsProps extends FilterState {
  teams: Array<{ squadId: number; name: string }>;
  activeCount: number;
  onSquadIdChange: (value?: number) => void;
  onPositionChange: (value?: number) => void;
  onStatusChange: (value?: string) => void;
  onClear: () => void;
  className: string;
}

function FilterControls({
  teams,
  squadId,
  position,
  status,
  activeCount,
  onSquadIdChange,
  onPositionChange,
  onStatusChange,
  onClear,
  className,
}: FilterControlsProps) {
  return (
    <div className={className}>
      <select
        value={squadId ?? ""}
        onChange={(e) =>
          onSquadIdChange(e.target.value ? Number(e.target.value) : undefined)
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
          onPositionChange(e.target.value ? Number(e.target.value) : undefined)
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
        onChange={(e) => onStatusChange(e.target.value || undefined)}
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
        onClick={onClear}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        disabled={activeCount === 0}
      >
        Clear all
      </button>
    </div>
  );
}

export function SearchFilters({
  squadId,
  position,
  status,
  onFilterChange,
  mode = "all",
}: SearchFiltersProps) {
  const { data: teamsData } = useTeams();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const teams = useMemo(
    () => [...(teamsData?.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [teamsData?.data],
  );

  useEffect(() => {
    if (!isMobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobileOpen]);

  const activeCount = countActiveFilters({ squadId, position, status });
  const showMobileTrigger = mode === "all" || mode === "mobileTrigger";
  const showDesktopControls = mode === "all" || mode === "desktopControls";

  const clearAllFilters = () =>
    onFilterChange({
      squad_id: undefined,
      position: undefined,
      status: undefined,
    });

  return (
    <>
      {showMobileTrigger && (
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open filters"
            title="Open filters"
            className="relative inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-muted transition-colors hover:border-accent hover:text-foreground"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {activeCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-accent-light px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-white">
                {activeCount}
              </span>
            )}
          </button>
        </div>
      )}

      {showDesktopControls && (
        <FilterControls
          teams={teams}
          squadId={squadId}
          position={position}
          status={status}
          activeCount={activeCount}
          onSquadIdChange={(value) => onFilterChange({ squad_id: value })}
          onPositionChange={(value) => onFilterChange({ position: value })}
          onStatusChange={(value) => onFilterChange({ status: value })}
          onClear={clearAllFilters}
          className="hidden gap-3 md:grid md:grid-cols-4"
        />
      )}

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-black/55"
            onClick={() => setIsMobileOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Player filters"
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="text-base font-semibold">Filters</h3>
                <p className="text-xs text-muted">
                  {activeCount > 0
                    ? `${activeCount} filter${activeCount === 1 ? "" : "s"} active`
                    : "Refine player search results"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="rounded-md border border-border bg-surface-alt p-2 text-muted transition-colors hover:text-foreground"
                aria-label="Close filters"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-4">
              <FilterControls
                teams={teams}
                squadId={squadId}
                position={position}
                status={status}
                activeCount={activeCount}
                onSquadIdChange={(value) => onFilterChange({ squad_id: value })}
                onPositionChange={(value) => onFilterChange({ position: value })}
                onStatusChange={(value) => onFilterChange({ status: value })}
                onClear={clearAllFilters}
                className="grid gap-3"
              />
            </div>

            <div className="border-t border-border px-4 py-3">
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="mobile-filter-done w-full rounded-lg border border-transparent bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-light"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
