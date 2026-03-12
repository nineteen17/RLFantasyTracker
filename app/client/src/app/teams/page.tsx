import type { Metadata } from "next";
import Link from "next/link";
import type { TeamsListResponse, Squad } from "@nrl/types";
import { ErrorState } from "@/components/ui/error-state";
import { apiFetchServer } from "@/lib/api-server";
import { teamPath } from "@/lib/entity-routes";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "NRL Teams and Team Lists",
  description: "Browse all NRL teams, squads, and roster pages.",
  alternates: {
    canonical: "/teams",
  },
};

async function fetchTeams(): Promise<TeamsListResponse | null> {
  try {
    return await apiFetchServer<TeamsListResponse>("/api/teams", {
      next: { revalidate },
    });
  } catch {
    return null;
  }
}

export default async function TeamsPage() {
  const data = await fetchTeams();

  if (!data) {
    return <ErrorState message="Unable to load teams right now." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Teams</h1>
        <p className="mt-2 text-muted">Browse all NRL teams and rosters</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.data.map((team: Squad) => (
          <Link
            key={team.squadId}
            href={teamPath(team.squadId, team.fullName || team.name)}
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
