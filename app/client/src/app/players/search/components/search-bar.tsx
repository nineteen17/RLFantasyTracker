"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { POSITION_LABELS } from "@/lib/constants";
import { useDebounce } from "@/hooks/use-debounce";
import { useRecentPlayers } from "@/hooks/use-player-storage";
import { playerPath } from "@/lib/entity-routes";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const router = useRouter();
  const [localValue, setLocalValue] = useState(value);
  const [focused, setFocused] = useState(false);
  const { players: recentPlayers, clear } = useRecentPlayers();

  // Keep input synced if URL changes externally
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const debouncedValue = useDebounce(localValue, 300);

  // Only notify parent if user changed it
  useEffect(() => {
    if (debouncedValue !== value) {
      onChange(debouncedValue);
    }
  }, [debouncedValue, value, onChange]);

  const recentMatches = useMemo(() => {
    const query = localValue.trim().toLowerCase();
    const rows = query
      ? recentPlayers.filter((player) =>
          player.fullName.toLowerCase().includes(query),
        )
      : recentPlayers;
    return rows.slice(0, 6);
  }, [localValue, recentPlayers]);

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search players by name..."
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        className="w-full rounded-lg border border-border bg-surface px-4 py-2"
      />

      {focused && recentMatches.length > 0 && (
        <div className="absolute z-30 mt-2 w-full rounded-lg border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-medium text-muted md:text-sm">
              Recent Players
            </span>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={clear}
              className="text-xs text-muted transition-colors hover:text-foreground"
            >
              Clear
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {recentMatches.map((player) => (
              <button
                type="button"
                key={player.playerId}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setFocused(false);
                  router.push(`${playerPath(player.playerId, player.fullName)}?from=search`);
                }}
                className="w-full cursor-pointer rounded-md px-4 py-2 text-left transition-colors hover:bg-surface-alt"
              >
                <div className="text-sm font-medium text-accent-light">
                  {player.fullName}
                </div>
                <div className="text-xs text-muted md:text-sm">
                  {(player.positions ?? [])
                    .map((p) => POSITION_LABELS[p] ?? String(p))
                    .join("/")}
                  {player.squadName ? ` • ${player.squadName}` : ""}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
