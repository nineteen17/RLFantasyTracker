"use client";

import Link from "next/link";
import { useTeams } from "@/hooks/api/use-teams";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { Squad } from "@nrl/types";

export default function TeamsPage() {
  const { data, isLoading, error } = useTeams();

  if (error) return <ErrorState message={error.message} />;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Teams</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(16)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Teams</h1>
        <p className="mt-2 text-muted">Browse all NRL teams and rosters</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.data.map((team: Squad) => (
          <Link
            key={team.squadId}
            href={`/teams/${team.squadId}`}
            className="rounded-lg border border-border bg-surface p-6 transition hover:border-border-hover hover:shadow-lg hover:shadow-accent/10"
          >
            <h2 className="text-xl font-semibold">{team.name}</h2>
            <p className="mt-1 text-sm text-muted">{team.fullName}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
