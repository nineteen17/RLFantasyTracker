import type { ByePlannerResponse } from "@nrl/types";
import { ErrorState } from "@/components/ui/error-state";
import { apiFetchServer } from "@/lib/api-server";
import { HistoryCloseButton } from "./components/history-close-button";
import { ByePlannerTable } from "./components/bye-planner-table";

export const dynamic = "force-dynamic";

async function fetchByePlanner(): Promise<ByePlannerResponse | null> {
  try {
    return await apiFetchServer<ByePlannerResponse>("/api/teams/byes", {
      cache: "no-store",
    });
  } catch (error) {
    console.error("[byes] Failed to load bye planner", error);
    return null;
  }
}

export default async function ByePlannerPage() {
  const data = await fetchByePlanner();

  if (!data) {
    return <ErrorState message="Unable to load bye data right now." />;
  }

  const rounds = data?.data.rounds ?? [];
  const teams = data?.data.teams ?? [];
  const season = data?.data.season ?? new Date().getFullYear();
  const sortedRounds = [...rounds].sort((a, b) => a - b);
  const teamsInStableOrder = [...teams].sort((a, b) => {
    const aByes = [...(a.byeRounds ?? [])].sort((x, y) => x - y);
    const bByes = [...(b.byeRounds ?? [])].sort((x, y) => x - y);
    const aFirstBye = aByes[0] ?? sortedRounds[sortedRounds.length - 1] ?? 999;
    const bFirstBye = bByes[0] ?? sortedRounds[sortedRounds.length - 1] ?? 999;

    if (aFirstBye !== bFirstBye) {
      return aFirstBye - bFirstBye;
    }

    const byeCount = Math.max(aByes.length, bByes.length);
    for (let i = 0; i < byeCount; i += 1) {
      const aRound = aByes[i] ?? 999;
      const bRound = bByes[i] ?? 999;
      if (aRound !== bRound) {
        return aRound - bRound;
      }
    }

    const nameCompare = a.name.localeCompare(b.name);
    if (nameCompare !== 0) {
      return nameCompare;
    }

    return Number(a.squadId) - Number(b.squadId);
  });

  if (rounds.length === 0 || teams.length === 0) {
    return (
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">Bye Planner</h1>
        <p className="text-muted">No bye data is available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Bye Planner</h1>
          <p className="mt-2 text-muted">{season} bye rounds by team.</p>
        </div>
        <HistoryCloseButton
          fallbackHref="/players/search"
          ariaLabel="Close bye planner"
        />
      </div>

      <ByePlannerTable rounds={sortedRounds} teams={teamsInStableOrder} />
    </div>
  );
}
