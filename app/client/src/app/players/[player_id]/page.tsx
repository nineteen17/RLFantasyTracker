"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlayerHistoryMatch } from "@nrl/types";
import { usePlayer, usePlayerHistory } from "@/hooks/api/use-player";
import { useTeams } from "@/hooks/api/use-teams";
import { useVenues } from "@/hooks/api/use-venues";
import { useRecentPlayers } from "@/hooks/use-player-storage";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayerHeader } from "./components/player-header";
import { StatsOverview } from "./components/stats-overview";
import { OwnershipCard } from "./components/ownership-card";
import { ProjectionsCard } from "./components/projections-card";
import { FixtureStrip } from "./components/fixture-strip";
import { ScoreHistory } from "./components/score-history";
import { SplitsTable } from "./components/splits-table";
import { DetailedStats } from "./components/detailed-stats";
import { ScoreBreakdown } from "./components/score-breakdown";
import { MinutesBuckets } from "./components/minutes-buckets";
import { PositionSplits } from "./components/position-splits";
import { MatchScopePicker } from "./components/match-scope-picker";
import { PlayedWithCard } from "./components/played-with-card";
import { formatNumber } from "@/lib/utils";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "scoring", label: "Scoring" },
  { key: "teammates", label: "Teammates" },
  { key: "projections", label: "Projections" },
  { key: "matchups", label: "Matchups" },
] as const;

const SCORING_SUB_TABS = [
  { key: "breakdown", label: "Breakdown" },
  { key: "minutes", label: "Minutes" },
  { key: "positions", label: "Positions" },
  { key: "trends", label: "Trends" },
  { key: "matchStats", label: "Match Stats" },
] as const;

type Tab = (typeof TABS)[number]["key"];
type ScoringSeason = "all" | number;
type ScoringSubTab = (typeof SCORING_SUB_TABS)[number]["key"];
const EMPTY_HISTORY_MATCHES: PlayerHistoryMatch[] = [];
const PRESEASON_PREF_STORAGE_KEY = "nrl_scoring_include_preseason_v1";
const TAB_QUERY_KEY = "tab";
const SUBTAB_QUERY_KEY = "subtab";
const SEASON_QUERY_KEY = "season";
const PRESEASON_QUERY_KEY = "preseason";
const TAB_KEYS = new Set<string>(TABS.map((tab) => tab.key));
const SCORING_SUBTAB_KEYS = new Set<string>(SCORING_SUB_TABS.map((tab) => tab.key));

function parseTabParam(value: string | null): Tab {
  if (value && TAB_KEYS.has(value)) return value as Tab;
  return "overview";
}

function parseScoringSubTabParam(value: string | null): ScoringSubTab {
  if (value && SCORING_SUBTAB_KEYS.has(value)) return value as ScoringSubTab;
  return "breakdown";
}

function parseScoringSeasonParam(value: string | null): ScoringSeason {
  if (!value || value === "all") return "all";
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : "all";
}

function parseBooleanParam(value: string | null): boolean | null {
  if (value == null) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true") return true;
  if (normalized === "0" || normalized === "false") return false;
  return null;
}

function PlayerPageContent({
  params,
}: {
  params: Promise<{ player_id: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { player_id } = use(params);
  const playerId = Number(player_id);
  const [preseasonPref, setPreseasonPref] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(PRESEASON_PREF_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const { addPlayer: addRecentPlayer } = useRecentPlayers();
  const savedRecentForPlayerRef = useRef<number | null>(null);
  const { data, isLoading, error } = usePlayer(playerId);
  const { data: teamsData } = useTeams();
  const { data: venuesData } = useVenues();
  const activeTab = parseTabParam(searchParams.get(TAB_QUERY_KEY));
  const activeScoringSubTab = parseScoringSubTabParam(
    searchParams.get(SUBTAB_QUERY_KEY),
  );
  const scoringSeason = parseScoringSeasonParam(
    searchParams.get(SEASON_QUERY_KEY),
  );
  const includePreseasonParam = parseBooleanParam(
    searchParams.get(PRESEASON_QUERY_KEY),
  );
  const includePreseason = includePreseasonParam ?? preseasonPref;
  const { data: historyData, isLoading: historyLoading } = usePlayerHistory(
    playerId,
    includePreseason,
  );
  const allHistoryMatches = historyData?.matches ?? EMPTY_HISTORY_MATCHES;
  const availableSeasons = useMemo<number[]>(() => {
    const seasons = new Set<number>();
    for (const match of allHistoryMatches) {
      seasons.add(match.season);
    }
    return [...seasons].sort((a, b) => b - a);
  }, [allHistoryMatches]);
  const resolvedScoringSeason =
    scoringSeason === "all"
      ? "all"
      : availableSeasons.includes(scoringSeason)
        ? scoringSeason
        : "all";
  const scoringMatches =
    resolvedScoringSeason === "all"
      ? allHistoryMatches
      : allHistoryMatches.filter(
          (m: PlayerHistoryMatch) => m.season === resolvedScoringSeason,
        );
  const scoringScopeLabel =
    resolvedScoringSeason === "all"
      ? "All Years"
      : `Season ${resolvedScoringSeason}`;
  const scoringSeasonSelectValue =
    resolvedScoringSeason === "all" ? "all" : String(resolvedScoringSeason);
  const fromSearch = searchParams.get("from") === "search";
  const returnToParam = searchParams.get("returnTo");
  const teamReturnTo =
    returnToParam && /^\/teams\/\d+$/.test(returnToParam)
      ? returnToParam
      : null;
  const backHref = teamReturnTo ?? "/players/search";
  const backLabel = teamReturnTo ? "Back to Team" : "Back to Search";
  const scoringSummary = useMemo(() => {
    if (scoringMatches.length === 0) return null;
    const points = scoringMatches.map(
      (m: PlayerHistoryMatch) => m.fantasyPoints,
    );
    const total = points.reduce((sum: number, pts: number) => sum + pts, 0);
    return {
      games: scoringMatches.length,
      avg: total / scoringMatches.length,
      high: Math.max(...points),
      low: Math.min(...points),
    };
  }, [scoringMatches]);

  const updateViewQuery = useCallback(
    ({
      tab,
      subtab,
      season,
      preseason,
    }: {
      tab?: Tab;
      subtab?: ScoringSubTab;
      season?: ScoringSeason;
      preseason?: boolean;
    }) => {
      const next = new URLSearchParams(searchParams.toString());

      if (tab !== undefined) next.set(TAB_QUERY_KEY, tab);
      if (subtab !== undefined) next.set(SUBTAB_QUERY_KEY, subtab);
      if (season !== undefined) {
        next.set(SEASON_QUERY_KEY, season === "all" ? "all" : String(season));
      }
      if (preseason !== undefined) {
        next.set(PRESEASON_QUERY_KEY, preseason ? "1" : "0");
      }

      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const teamNames = useMemo(() => {
    const map: Record<string, string> = {};
    if (teamsData?.data) {
      for (const team of teamsData.data) {
        map[String(team.squadId)] = team.shortName ?? team.name;
      }
    }
    return map;
  }, [teamsData]);

  const venueNames = useMemo(() => {
    const map: Record<string, string> = {};
    if (venuesData?.data) {
      for (const venue of venuesData.data) {
        map[String(venue.venueId)] = venue.name;
      }
    }
    return map;
  }, [venuesData]);

  useEffect(() => {
    if (!fromSearch || !data) return;
    if (savedRecentForPlayerRef.current === data.player.playerId) return;
    addRecentPlayer({
      playerId: data.player.playerId,
      fullName: data.player.fullName,
      squadName: data.player.squad.shortName ?? data.player.squad.name,
      positions: data.player.positions,
      status: data.player.status,
      cost: data.player.cost,
      avgPoints: data.current?.avgPoints ?? null,
    });
    savedRecentForPlayerRef.current = data.player.playerId;
  }, [addRecentPlayer, data, fromSearch]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        PRESEASON_PREF_STORAGE_KEY,
        includePreseason ? "1" : "0",
      );
    } catch {
      // no-op if storage is unavailable
    }
  }, [includePreseason]);

  if (error) return <ErrorState message={error.message} />;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-10" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { player, current, fixtureStrip } = data;

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent-light md:text-base"
      >
        <span>&larr;</span>
        <span>{backLabel}</span>
      </Link>
      <PlayerHeader player={player} avgPoints={current?.avgPoints ?? null} />

      {current && (
        <>
          <nav className="flex gap-2 overflow-x-auto pb-1 scrollbar-none md:grid md:grid-cols-5 md:gap-3 md:overflow-visible md:pb-0">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => updateViewQuery({ tab: tab.key })}
                className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-medium transition-colors md:w-full md:px-3 md:py-3 md:text-base ${
                  activeTab === tab.key
                    ? "border-accent-light bg-accent-light/15 text-accent-light"
                    : "border-border bg-surface text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="space-y-6">
            {activeTab === "overview" && (
              <>
                <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
                  <StatsOverview
                    current={current}
                    positions={player.positions}
                  />
                  <OwnershipCard current={current} />
                </div>
              </>
            )}

            {activeTab === "scoring" && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted md:text-base">
                      Season
                    </span>
                    <select
                      value={scoringSeasonSelectValue}
                      onChange={(event) => {
                        const value = event.target.value;
                        updateViewQuery({
                          tab: "scoring",
                          season: value === "all" ? "all" : Number(value),
                        });
                      }}
                      className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-light md:text-base"
                    >
                      <option value="all">All Years</option>
                      {availableSeasons.map((season) => (
                        <option key={season} value={season}>
                          {season}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted md:text-base">
                      Matches
                    </span>
                    <MatchScopePicker
                      includePreseason={includePreseason}
                      onChange={(nextValue) => {
                        setPreseasonPref(nextValue);
                        updateViewQuery({
                          tab: "scoring",
                          preseason: nextValue,
                        });
                      }}
                    />
                  </div>
                </div>

                <nav className="flex gap-2 overflow-x-auto pb-1 scrollbar-none sm:pb-0">
                  {SCORING_SUB_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() =>
                        updateViewQuery({ tab: "scoring", subtab: tab.key })
                      }
                      className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors md:text-sm ${
                        activeScoringSubTab === tab.key
                          ? "border-accent-light bg-accent-light/15 text-accent-light"
                          : "border-border bg-surface text-muted hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>

                {historyLoading ? (
                  <Skeleton className="h-24" />
                ) : (
                  scoringSummary && (
                    <div className="grid grid-cols-4 gap-2 md:gap-3">
                      <div className="min-w-0 rounded-lg border border-border bg-surface-alt/40 p-2 md:p-3">
                        <p className="text-[10px] text-muted md:text-sm">GP</p>
                        <p className="text-base font-semibold tabular-nums md:text-xl">
                          {scoringSummary.games}
                        </p>
                      </div>
                      <div className="min-w-0 rounded-lg border border-border bg-surface-alt/40 p-2 md:p-3">
                        <p className="text-[10px] text-muted md:text-sm">Avg</p>
                        <p className="text-base font-semibold tabular-nums md:text-xl">
                          {formatNumber(scoringSummary.avg)}
                        </p>
                      </div>
                      <div className="min-w-0 rounded-lg border border-border bg-surface-alt/40 p-2 md:p-3">
                        <p className="text-[10px] text-muted md:text-sm">High</p>
                        <p className="text-base font-semibold tabular-nums md:text-xl">
                          {scoringSummary.high}
                        </p>
                      </div>
                      <div className="min-w-0 rounded-lg border border-border bg-surface-alt/40 p-2 md:p-3">
                        <p className="text-[10px] text-muted md:text-sm">Low</p>
                        <p className="text-base font-semibold tabular-nums md:text-xl">
                          {scoringSummary.low}
                        </p>
                      </div>
                    </div>
                  )
                )}
                {activeScoringSubTab === "breakdown" && (
                  <ScoreBreakdown
                    matches={scoringMatches}
                    isLoading={historyLoading}
                  />
                )}
                {activeScoringSubTab === "minutes" && (
                  <MinutesBuckets
                    matches={scoringMatches}
                    isLoading={historyLoading}
                  />
                )}
                {activeScoringSubTab === "positions" && (
                  <PositionSplits
                    matches={scoringMatches}
                    isLoading={historyLoading}
                  />
                )}
                {activeScoringSubTab === "trends" && (
                  <ScoreHistory
                    matches={scoringMatches}
                    allMatches={allHistoryMatches}
                    isLoading={historyLoading}
                    scopeLabel={scoringScopeLabel}
                  />
                )}
                {activeScoringSubTab === "matchStats" && (
                  <DetailedStats
                    matches={scoringMatches}
                    isLoading={historyLoading}
                  />
                )}
              </>
            )}

            {activeTab === "projections" && (
              <ProjectionsCard current={current} cost={player.cost} />
            )}

            {activeTab === "matchups" && (
              <>
                <FixtureStrip
                  fixtures={fixtureStrip}
                  squadId={player.squadId}
                />
                <SplitsTable
                  current={current}
                  teamNames={teamNames}
                  venueNames={venueNames}
                />
              </>
            )}

            {activeTab === "teammates" && (
              <PlayedWithCard playerId={player.playerId} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function PlayerPage({
  params,
}: {
  params: Promise<{ player_id: string }>;
}) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PlayerPageContent params={params} />
    </Suspense>
  );
}
