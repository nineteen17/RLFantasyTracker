import type { Squad } from "@nrl/types";
import { TeamLogo } from "@/components/ui/team-logo";

interface TeamHeaderProps {
  team: Squad & { roster?: unknown[]; fixtureStrip?: unknown[] };
}

export function TeamHeader({ team }: TeamHeaderProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="flex items-center gap-4">
        <TeamLogo
          squadId={team.squadId}
          teamName={team.name}
          className="h-14 w-14 sm:h-16 sm:w-16"
        />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold sm:text-3xl">{team.name}</h1>
          <p className="mt-1 truncate text-muted">{team.fullName}</p>
        </div>
      </div>
    </div>
  );
}
