"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useLiveRound, useLiveRoundStats } from "@/hooks/api/use-live";
import { useTimezone } from "@/hooks/use-timezone";
import { formatMatchDate } from "@/lib/timezone";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TimezonePicker } from "@/components/timezone-picker";
import { MatchStatsPanel } from "../../components/match-stats-panel";
import type { LiveMatch, LivePlayerStat } from "@nrl/types";

export default function MatchDetailPage({
  params,
}: {
  params: Promise<{ round_id: string; match_id: string }>;
}) {
  const { round_id, match_id } = use(params);
  const roundId = Number(round_id);
  const matchId = Number(match_id);

  const [tz] = useTimezone();
  const { data: roundData, isLoading, error } = useLiveRound(roundId);
  const isLive = roundData?.status === "active";
  const { data: statsData, isLoading: statsLoading } = useLiveRoundStats(
    roundId,
    isLive,
  );

  if (error) return <ErrorState message={error.message} />;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const match = roundData?.matches.find((m: LiveMatch) => m.id === matchId);

  if (!match) {
    return <ErrorState message="Match not found" />;
  }

  // Filter players for this match's teams
  const homePlayers: LivePlayerStat[] = [];
  const awayPlayers: LivePlayerStat[] = [];
  if (statsData) {
    for (const p of statsData.players) {
      if (p.squadId === match.homeSquadId) homePlayers.push(p);
      else if (p.squadId === match.awaySquadId) awayPlayers.push(p);
    }
  }

  const isPlaying = match.status === "playing";
  const isComplete = match.status === "complete";
  const homeWon = isComplete && match.homeScore > match.awayScore;
  const awayWon = isComplete && match.awayScore > match.homeScore;

  function formatClock(clock?: { p: number | string; s: number }): string {
    if (!clock) return "";
    if (clock.s < 0) return "HT";
    const mins = Math.max(0, Math.floor(clock.s / 60));
    const rawPeriod = String(clock.p).toUpperCase();
    const period = rawPeriod.includes("2")
      ? "2nd"
      : rawPeriod.includes("1")
        ? "1st"
        : "1st";
    return `${mins}' (${period})`;
  }

  return (
    <div className="space-y-6">
      {/* Back + timezone */}
      <div className="flex items-center justify-between">
        <Link
          href={`/live?round=${roundId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent-light transition-colors"
        >
          <span>&larr;</span>
          <span>Round {roundId}</span>
        </Link>
        <TimezonePicker />
      </div>

      {/* Match header */}
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-muted">{match.venueName}</span>
          <div className="flex items-center gap-2">
            {isPlaying && match.clock && (
              <span className="font-mono text-sm text-accent-light">
                {formatClock(match.clock)}
              </span>
            )}
            <span
              className={`rounded px-2.5 py-1 text-xs font-medium ${
                isPlaying
                  ? "bg-danger/15 text-danger"
                  : "bg-surface-alt text-muted"
              }`}
            >
              {isPlaying
                ? "LIVE"
                : isComplete
                  ? "Full Time"
                  : formatMatchDate(match.date, tz)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div
              className={`text-2xl font-bold ${awayWon ? "text-muted/50" : ""}`}
            >
              {match.homeSquadName}
            </div>
          </div>
          <div className="flex items-center gap-4 px-6">
            <span
              className={`text-4xl font-bold tabular-nums ${homeWon ? "text-accent-light" : awayWon ? "text-muted/50" : ""}`}
            >
              {match.homeScore}
            </span>
            <span className="text-xl text-muted">-</span>
            <span
              className={`text-4xl font-bold tabular-nums ${awayWon ? "text-accent-light" : homeWon ? "text-muted/50" : ""}`}
            >
              {match.awayScore}
            </span>
          </div>
          <div className="flex-1 text-right">
            <div
              className={`text-2xl font-bold ${homeWon ? "text-muted/50" : ""}`}
            >
              {match.awaySquadName}
            </div>
          </div>
        </div>

        {!isPlaying && !isComplete && (
          <div className="mt-3 text-center">
            <Countdown targetDate={match.date} />
          </div>
        )}
      </div>

      {/* Player stats */}
      <div className="rounded-lg border border-border bg-surface">
        <MatchStatsPanel
          homeSquadName={match.homeSquadName}
          awaySquadName={match.awaySquadName}
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
          isLoading={statsLoading}
        />
      </div>
    </div>
  );
}

function Countdown({ targetDate }: { targetDate: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const diff = new Date(targetDate).getTime() - now;
  if (diff <= 0) return null;

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${mins}m`);

  return (
    <span className="text-sm text-muted/80">
      Starts in <span className="font-mono">{parts.join(" ")}</span>
    </span>
  );
}
