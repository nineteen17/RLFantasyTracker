import type { Squad } from "@nrl/types";

interface TeamHeaderProps {
  team: Squad & { roster?: unknown[]; fixtureStrip?: unknown[] };
}

export function TeamHeader({ team }: TeamHeaderProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h1 className="text-3xl font-bold">{team.name}</h1>
      <p className="mt-1 text-muted">{team.fullName}</p>
    </div>
  );
}
