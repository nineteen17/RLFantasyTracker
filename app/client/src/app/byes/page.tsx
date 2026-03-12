import type { ByePlannerResponse } from "@nrl/types";
import { ErrorState } from "@/components/ui/error-state";
import { apiFetchServer } from "@/lib/api-server";

export const revalidate = 3600;

async function fetchByePlanner(): Promise<ByePlannerResponse | null> {
  try {
    return await apiFetchServer<ByePlannerResponse>("/api/teams/byes", {
      next: { revalidate },
    });
  } catch {
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
      <div>
        <h1 className="text-3xl font-bold">Bye Planner</h1>
        <p className="mt-2 text-muted">{season} bye rounds by team.</p>
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
              {teams.map((team, teamIdx) => {
                const byeRounds = new Set<number>(team.byeRounds);
                const isLastRow = teamIdx === teams.length - 1;
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
                        {team.shortName ?? team.name}
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
