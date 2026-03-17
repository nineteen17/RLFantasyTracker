"use client";

import { useState } from "react";
import type { ByePlannerTeam } from "@nrl/types";

interface ByePlannerTableProps {
  rounds: number[];
  teams: ByePlannerTeam[];
}

export function ByePlannerTable({ rounds, teams }: ByePlannerTableProps) {
  const [selectedRound, setSelectedRound] = useState<number | null>(null);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-2 sm:p-3">
      <p className="px-1 text-xs text-muted sm:text-sm">
        Tap a round header to highlight bye teams in that round.
      </p>
      <div className="overflow-x-auto lg:overflow-visible">
        <table className="w-full min-w-[800px] table-fixed border-separate border-spacing-0 text-[11px] sm:min-w-[920px] sm:text-xs lg:min-w-0 lg:text-sm">
          <thead>
            <tr className="bg-surface-alt/30">
              <th className="sticky left-0 z-30 w-[74px] rounded-tl-xl border-b border-r border-border bg-surface px-1 py-1 text-left font-semibold shadow-[8px_0_10px_-10px_rgba(0,0,0,0.9)] sm:w-[132px] sm:px-2 sm:py-2 lg:w-[158px]">
                Team
              </th>
              {rounds.map((roundId) => {
                const isSelected = selectedRound === roundId;
                return (
                  <th
                    key={roundId}
                    className={`w-8 border-b border-border px-0.5 py-1 text-center sm:w-9 sm:px-1 sm:py-1.5 lg:w-10 ${
                      isSelected ? "bg-warning/10" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedRound((current) =>
                          current === roundId ? null : roundId,
                        )
                      }
                      className={`w-full rounded px-1 py-0.5 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/70 ${
                        isSelected
                          ? "bg-warning/25 text-warning"
                          : "text-foreground hover:bg-surface-alt/60"
                      }`}
                      aria-pressed={isSelected}
                      aria-label={`Highlight round ${roundId} byes`}
                    >
                      R{roundId}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {teams.map((team, teamIdx) => {
              const byeRounds = new Set<number>(team.byeRounds);
              const isLastRow = teamIdx === teams.length - 1;
              const hasSelectedBye =
                selectedRound != null && byeRounds.has(selectedRound);

              return (
                <tr
                  key={team.squadId}
                  className={hasSelectedBye ? "bg-warning/5" : ""}
                >
                  <th
                    className={`sticky left-0 z-20 w-[74px] border-r border-border px-1 py-0.5 text-left shadow-[8px_0_10px_-10px_rgba(0,0,0,0.9)] sm:w-[132px] sm:px-2 sm:py-1.5 lg:w-[158px] ${
                      hasSelectedBye ? "bg-warning/10" : "bg-surface"
                    } ${
                      isLastRow ? "rounded-bl-xl border-b-0" : "border-b"
                    }`}
                  >
                    <div className="max-w-[66px] truncate text-[9px] font-semibold leading-tight sm:max-w-none sm:text-xs lg:text-sm">
                      {team.name}
                    </div>
                    <div className="hidden text-[10px] text-muted sm:block">
                      Next:{" "}
                      {team.nextByeRound != null ? `R${team.nextByeRound}` : "-"}
                    </div>
                  </th>
                  {rounds.map((roundId) => {
                    const isBye = byeRounds.has(roundId);
                    const isRoundSelected = selectedRound === roundId;
                    const isOtherRoundSelected =
                      selectedRound != null && !isRoundSelected;

                    return (
                      <td
                        key={`${team.squadId}-${roundId}`}
                        className={`px-0.5 py-1 text-center transition-colors sm:px-1 sm:py-1.5 ${
                          isLastRow ? "border-b-0" : "border-b border-border/70"
                        } ${
                          isRoundSelected ? "bg-warning/10" : ""
                        } ${isOtherRoundSelected ? "opacity-55" : ""}`}
                      >
                        {isBye ? (
                          <span
                            className={`inline-flex rounded px-1 py-0.5 text-[9px] font-semibold sm:px-1.5 sm:text-[10px] lg:px-2 lg:text-[11px] ${
                              isRoundSelected
                                ? "bg-warning/35 text-warning ring-1 ring-warning/40"
                                : "bg-warning/20 text-warning"
                            }`}
                          >
                            <span className="sm:hidden">B</span>
                            <span className="hidden sm:inline">BYE</span>
                          </span>
                        ) : (
                          <span
                            className={
                              isRoundSelected ? "text-muted/70" : "text-muted/40"
                            }
                          >
                            -
                          </span>
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
  );
}
