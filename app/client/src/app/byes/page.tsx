import type { ByePlannerResponse } from "@nrl/types";
import { ErrorState } from "@/components/ui/error-state";
import { apiFetchServer } from "@/lib/api-server";
import { HistoryCloseButton } from "./components/history-close-button";

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

      <div className="rounded-xl border border-border bg-surface">
        <div className="overflow-x-auto lg:overflow-visible">
          <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-0 text-[11px] sm:min-w-[900px] sm:text-xs lg:min-w-0 lg:text-sm">
            <thead>
              <tr className="bg-surface-alt/30">
                <th className="sticky left-0 z-30 w-[46px] rounded-tl-xl border-b border-r border-border bg-surface px-1 py-1.5 text-left font-semibold shadow-[8px_0_10px_-10px_rgba(0,0,0,0.9)] sm:w-[132px] sm:px-2 sm:py-2 lg:w-[158px]">
                  Team
                </th>
                {rounds.map((roundId) => (
                  <th
                    key={roundId}
                    className="w-8 border-b border-border px-0.5 py-1.5 text-center font-semibold sm:w-9 sm:px-1 sm:py-2 lg:w-10"
                  >
                    R{roundId}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamsInStableOrder.map((team, teamIdx) => {
                const byeRounds = new Set<number>(team.byeRounds);
                const isLastRow = teamIdx === teamsInStableOrder.length - 1;
                return (
                  <tr key={team.squadId}>
                    <th
                      className={`sticky left-0 z-20 w-[46px] border-r border-border bg-surface px-1 py-1 text-left shadow-[8px_0_10px_-10px_rgba(0,0,0,0.9)] sm:w-[132px] sm:px-2 sm:py-1.5 lg:w-[158px] ${
                        isLastRow
                          ? "rounded-bl-xl border-b-0"
                          : "border-b"
                      }`}
                    >
                      <div className="max-w-[42px] truncate text-[10px] font-semibold sm:max-w-none sm:text-xs lg:text-sm">
                        <span className="lg:hidden">{team.shortName ?? team.name}</span>
                        <span className="hidden lg:inline">{team.name}</span>
                      </div>
                      <div className="hidden text-[10px] text-muted sm:block">
                        Next:{" "}
                        {team.nextByeRound != null
                          ? `R${team.nextByeRound}`
                          : "-"}
                      </div>
                    </th>
                    {rounds.map((roundId) => {
                      const isBye = byeRounds.has(roundId);
                      return (
                        <td
                          key={`${team.squadId}-${roundId}`}
                          className={`px-0.5 py-1 text-center sm:px-1 sm:py-1.5 ${
                            isLastRow ? "border-b-0" : "border-b border-border/70"
                          }`}
                        >
                          {isBye ? (
                            <span className="inline-flex rounded bg-warning/20 px-1 py-0.5 text-[9px] font-semibold text-warning sm:px-1.5 sm:text-[10px] lg:px-2 lg:text-[11px]">
                              <span className="sm:hidden">B</span>
                              <span className="hidden sm:inline">BYE</span>
                            </span>
                          ) : (
                            <span className="text-muted/40">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
