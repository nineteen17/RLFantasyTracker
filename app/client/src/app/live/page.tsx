"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLiveRounds, useLiveRound } from "@/hooks/api/use-live";
import { useTimezone } from "@/hooks/use-timezone";
import { formatMatchDate, type TimezoneValue } from "@/lib/timezone";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TimezonePicker } from "@/components/timezone-picker";
import type { LiveMatch, LiveRoundSummary } from "@nrl/types";

function LivePageContent() {
  const searchParams = useSearchParams();
  const roundParam = searchParams.get("round");
  const parsedRoundParam = roundParam ? Number(roundParam) : NaN;
  const roundParamValue =
    Number.isFinite(parsedRoundParam) && parsedRoundParam > 0
      ? parsedRoundParam
      : null;
  const [tz] = useTimezone();
  const { data: liveData, isLoading, error } = useLiveRounds();
  const [manualSelectedRoundId, setManualSelectedRoundId] = useState<number | null>(
    null,
  );
  const selectedRoundId =
    manualSelectedRoundId ?? roundParamValue ?? liveData?.activeRound?.roundId ?? null;
  const pillsRef = useRef<HTMLDivElement>(null);

  // Scroll active pill into view
  useEffect(() => {
    if (selectedRoundId && pillsRef.current) {
      const activeBtn = pillsRef.current.querySelector("[data-active='true']");
      activeBtn?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedRoundId]);

  const isActiveRound = selectedRoundId === liveData?.activeRound?.roundId;
  const { data: fetchedRound, isFetching } = useLiveRound(
    isActiveRound ? null : selectedRoundId,
  );

  const roundData = isActiveRound ? liveData?.activeRound : fetchedRound;

  if (error) return <ErrorState message={error.message} />;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!liveData) return null;

  const hasLiveMatch = roundData?.matches.some(
    (m: LiveMatch) => m.status === "playing",
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold shrink-0">2026 Draw</h1>
          {hasLiveMatch && (
            <span className="flex items-center gap-1.5 text-sm text-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
              Live
            </span>
          )}
        </div>
        <TimezonePicker />
      </div>

      {/* Round pill bar */}
      <div
        ref={pillsRef}
        className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none"
      >
        {liveData.rounds.map((r: LiveRoundSummary) => {
          const isSelected = r.roundId === selectedRoundId;
          const isActive = r.status === "active";
          const isComplete = r.status === "complete";

          return (
            <button
              key={r.roundId}
              type="button"
              data-active={isSelected}
              onClick={() => setManualSelectedRoundId(r.roundId)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                isSelected
                  ? "bg-accent text-white"
                  : isActive
                    ? "bg-accent/15 text-accent-light hover:bg-accent/25"
                    : isComplete
                      ? "bg-surface-alt text-muted hover:text-foreground"
                      : "bg-surface text-muted/60 hover:text-muted"
              }`}
            >
              {r.roundId}
              {isActive && !isSelected && (
                <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" />
              )}
            </button>
          );
        })}
      </div>

      {/* Match cards grid */}
      {roundData ? (
        <div
          className={`grid gap-4 md:grid-cols-2 transition-opacity duration-200 ${
            isFetching && !isActiveRound ? "opacity-50" : "opacity-100"
          }`}
        >
          {roundData.matches.map((match: LiveMatch) => (
            <MatchScoreCard
              key={match.id}
              match={match}
              roundId={roundData.roundId}
              tz={tz}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      )}
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
    <span className="text-xs text-muted/80">
      Starts in <span className="font-mono">{parts.join(" ")}</span>
    </span>
  );
}

function MatchScoreCard({
  match,
  roundId,
  tz,
}: {
  match: LiveMatch;
  roundId: number;
  tz: TimezoneValue;
}) {
  const isLive = match.status === "playing";
  const isComplete = match.status === "complete";
  const isUpcoming = !isLive && !isComplete;

  const homeWon = isComplete && match.homeScore > match.awayScore;
  const awayWon = isComplete && match.awayScore > match.homeScore;

  function formatClock(clock?: { p: number; s: number }): string {
    if (!clock) return "";
    if (clock.s < 0) return "HT";
    const mins = Math.max(0, Math.floor(clock.s / 60));
    const period = clock.p >= 2 ? "2nd" : "1st";
    return `${mins}' (${period})`;
  }

  return (
    <Link
      href={`/live/${roundId}/${match.id}`}
      className="flex flex-col rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-hover hover:shadow-lg hover:shadow-accent/5"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-muted truncate mr-2">
          {match.venueName}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {isLive && match.clock && (
            <span className="font-mono text-xs text-accent-light">
              {formatClock(match.clock)}
            </span>
          )}
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              isLive
                ? "bg-danger text-white"
                : isComplete
                  ? "bg-surface-alt text-muted"
                  : "bg-surface-alt text-muted/60"
            }`}
          >
            {isLive
              ? "LIVE"
              : isComplete
                ? "FT"
                : formatMatchDate(match.date, tz)}
          </span>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-between">
        <div className="flex-1">
          <div
            className={`text-lg font-bold ${awayWon ? "text-muted/50" : ""}`}
          >
            {match.homeSquadName}
          </div>
        </div>
        <div className="flex items-center gap-3 px-4">
          <span
            className={`text-2xl font-bold tabular-nums ${homeWon ? "text-accent-light" : awayWon ? "text-muted/50" : ""}`}
          >
            {match.homeScore}
          </span>
          <span className="text-muted">-</span>
          <span
            className={`text-2xl font-bold tabular-nums ${awayWon ? "text-accent-light" : homeWon ? "text-muted/50" : ""}`}
          >
            {match.awayScore}
          </span>
        </div>
        <div className="flex-1 text-right">
          <div
            className={`text-lg font-bold ${homeWon ? "text-muted/50" : ""}`}
          >
            {match.awaySquadName}
          </div>
        </div>
      </div>

      <div className="mt-2 text-center text-xs">
        {isUpcoming ? (
          <Countdown targetDate={match.date} />
        ) : (
          <span>&nbsp;</span>
        )}
      </div>
    </Link>
  );
}

export default function LivePage() {
  return (
    <>
      <Suspense>
        <LivePageContent />
      </Suspense>
    </>
  );
}
