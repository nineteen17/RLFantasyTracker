"use client";

import { use } from "react";
import Link from "next/link";
import { useTeam } from "@/hooks/api/use-team";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamHeader } from "./components/team-header";
import { RosterGrid } from "./components/roster-grid";
import { FixtureStrip } from "./components/fixture-strip";

export default function TeamPage({ params }: { params: Promise<{ squad_id: string }> }) {
  const { squad_id } = use(params);
  const squadId = Number(squad_id);
  const { data, isLoading, error } = useTeam(squadId);

  if (error) return <ErrorState message={error.message} />;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      <Link
        href="/teams"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent-light md:text-base"
      >
        <span>&larr;</span>
        <span>Back to Teams</span>
      </Link>
      <TeamHeader team={data.data} />
      <FixtureStrip
        fixtures={data.data.fixtureStrip}
        byeRounds={data.data.byeRounds}
        squadId={squadId}
        teamName={data.data.shortName ?? data.data.name}
      />
      <RosterGrid roster={data.data.roster} squadId={squadId} />
    </div>
  );
}
