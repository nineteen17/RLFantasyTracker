"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type {
  PlayerDetailResponse,
  PlayerHistoryMatch,
  PlayerHistoryResponse,
  TeamsListResponse,
} from "@nrl/types";
import { usePlayer, usePlayerHistory } from "@/hooks/api/use-player";
import { useTeams } from "@/hooks/api/use-teams";
import { useVenues, type VenuesResponse } from "@/hooks/api/use-venues";
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
import { isTeamRoutePath } from "@/lib/entity-routes";
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
type ParsedScoringSeason = ScoringSeason | null;
type ScoringSubTab = (typeof SCORING_SUB_TABS)[number]["key"];
const EMPTY_HISTORY_MATCHES: PlayerHistoryMatch[] = [];
const DEFAULT_SCORING_SEASON = 2026;
const OFFICIAL_MATCH_TYPE_SET = new Set(["nrl", "finals"]);
const PRESEASON_MATCH_KEYWORDS = [
  "pre-season",
  "preseason",
  "trial",
  "allstar",
  "all-star",
  "world-club",
];
const OFFICIAL_MATCH_KEYWORDS = ["nrl", "final"];
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

function parseScoringSeasonParam(value: string | null): ParsedScoringSeason {
  if (value == null || value.trim() === "") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "all") return "all";
  const parsed = Number(normalized);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseBooleanParam(value: string | null): boolean | null {
  if (value == null) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true") return true;
  if (normalized === "0" || normalized === "false") return false;
  return null;
}

function normalizeMatchType(value: string): string {
  return value.trim().toLowerCase();
}

function classifyMatchType(value: string): "official" | "preseason" | "other" {
  const normalized = normalizeMatchType(value);
  if (!normalized) return "other";

  if (OFFICIAL_MATCH_TYPE_SET.has(normalized)) return "official";
  if (PRESEASON_MATCH_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "preseason";
  }
  if (OFFICIAL_MATCH_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "official";
  }
  return "other";
}

function shouldIncludeByScope(matchType: string, includePreseason: boolean): boolean {
  const category = classifyMatchType(matchType);
  if (includePreseason) {
    return category === "official" || category === "preseason";
  }
  return category === "official";
}

function resolveBackLink(
  returnToParam: string | null,
  fromWatchlist: boolean,
): { href: string; label: string } {
  if (returnToParam) {
    if (isTeamRoutePath(returnToParam)) {
      return { href: returnToParam, label: "Back to Team" };
    }
    if (returnToParam === "/watchlist") {
      return { href: returnToParam, label: "Back to Watchlist" };
    }
    if (/^\/live\/\d+\/\d+$/.test(returnToParam)) {
      return { href: returnToParam, label: "Back to Match" };
    }
    if (/^\/live(?:\?round=\d+)?$/.test(returnToParam)) {
      return { href: returnToParam, label: "Back to Live" };
    }
  }

  if (fromWatchlist) {
    return { href: "/watchlist", label: "Back to Watchlist" };
  }

  return { href: "/players/search", label: "Back to Search" };
}

interface PlayerPageClientProps {
  playerId: number;
  initialPlayerData?: PlayerDetailResponse;
  initialHistoryData?: PlayerHistoryResponse;
  initialHistoryIncludePreseason: boolean;
  initialTeamsData?: TeamsListResponse;
  initialVenuesData?: VenuesResponse;
}

export default function PlayerPageClient({
  playerId,
  initialPlayerData,
  initialHistoryData,
  initialHistoryIncludePreseason,
  initialTeamsData,
  initialVenuesData,
}: PlayerPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addPlayer: addRecentPlayer } = useRecentPlayers();
  const savedRecentForPlayerRef = useRef<number | null>(null);
  const { data, isLoading, error } = usePlayer(playerId, {
    initialData: initialPlayerData,
  });
  const { data: teamsData } = useTeams({ initialData: initialTeamsData });
  const { data: venuesData } = useVenues({ initialData: initialVenuesData });
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
  const includePreseason = includePreseasonParam ?? false;
  const playerHistoryInitialData =
    includePreseason === initialHistoryIncludePreseason
      ? initialHistoryData
      : undefined;
  const { data: historyData, isLoading: historyLoading } = usePlayerHistory(
    playerId,
    includePreseason,
    { initialData: playerHistoryInitialData },
  );
  const allHistoryMatches = historyData?.matches ?? EMPTY_HISTORY_MATCHES;
  const scopedHistoryMatches = useMemo(
    () =>
      allHistoryMatches.filter((match: PlayerHistoryMatch) =>
        shouldIncludeByScope(match.matchType, includePreseason),
      ),
    [allHistoryMatches, includePreseason],
  );
  const availableSeasons = useMemo<number[]>(() => {
    const seasons = new Set<number>();
    for (const match of scopedHistoryMatches) {
      seasons.add(match.season);
    }
    return [...seasons].sort((a, b) => b - a);
  }, [scopedHistoryMatches]);
  const defaultScoringSeason = useMemo<ScoringSeason>(() => {
    if (availableSeasons.includes(DEFAULT_SCORING_SEASON)) {
      return DEFAULT_SCORING_SEASON;
    }
    return availableSeasons[0] ?? "all";
  }, [availableSeasons]);
  const resolvedScoringSeason =
    scoringSeason === null
      ? defaultScoringSeason
      : scoringSeason === "all"
        ? "all"
        : availableSeasons.includes(scoringSeason)
          ? scoringSeason
          : defaultScoringSeason;
  const scoringMatches =
    resolvedScoringSeason === "all"
      ? scopedHistoryMatches
      : scopedHistoryMatches.filter(
          (m: PlayerHistoryMatch) => m.season === resolvedScoringSeason,
        );
  const scoringScopeLabel =
    resolvedScoringSeason === "all"
      ? "All Years"
      : `Season ${resolvedScoringSeason}`;
  const scoringSeasonSelectValue =
    resolvedScoringSeason === "all" ? "all" : String(resolvedScoringSeason);
  const fromSearch = searchParams.get("from") === "search";
  const fromWatchlist = searchParams.get("from") === "watchlist";
  const returnToParam = searchParams.get("returnTo");
  const { href: backHref, label: backLabel } = resolveBackLink(
    returnToParam,
    fromWatchlist,
  );
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

  const { player, current, fixtureStrip, byeRounds } = data;

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
                    listedPositions={player.positions}
                    isLoading={historyLoading}
                  />
                )}
                {activeScoringSubTab === "trends" && (
                  <ScoreHistory
                    matches={scoringMatches}
                    allMatches={scopedHistoryMatches}
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
                  byeRounds={byeRounds}
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
