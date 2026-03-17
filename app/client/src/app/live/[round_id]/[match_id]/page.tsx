"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLiveRound, useLiveRoundStats } from "@/hooks/api/use-live";
import { useTimezone } from "@/hooks/use-timezone";
import { formatMatchDate } from "@/lib/timezone";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TimezonePicker } from "@/components/timezone-picker";
import { TeamLogo } from "@/components/ui/team-logo";
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedTeam = searchParams.get("team") === "away" ? "away" : "home";

  const [tz] = useTimezone();
  const { data: roundData, isLoading, error } = useLiveRound(roundId, {
    includeTeamLists: true,
  });
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
  const isPreGame = !isPlaying && !isComplete;
  const homeWon = isComplete && match.homeScore > match.awayScore;
  const awayWon = isComplete && match.awayScore > match.homeScore;

  function formatClock(clock?: {
    p: number | string;
    s: number;
  }): { label: string; isAwaitingFullTime: boolean } {
    if (!clock) return { label: "", isAwaitingFullTime: false };
    const mins = Math.max(0, Math.floor(clock.s / 60));
    const rawPeriod = String(clock.p).toUpperCase();
    const isSecondPeriod = rawPeriod.includes("2");
    if (clock.s < 0) {
      return {
        label: isSecondPeriod ? "Awaiting FT" : "HT",
        isAwaitingFullTime: isSecondPeriod,
      };
    }
    const period = isSecondPeriod ? "2nd" : "1st";
    return {
      label: `${mins}' (${period})`,
      isAwaitingFullTime: false,
    };
  }

  const clockDisplay = formatClock(match.clock);
  const isAwaitingFullTime = isPlaying && clockDisplay.isAwaitingFullTime;
  const handleTeamChange = (team: "home" | "away") => {
    const next = new URLSearchParams(searchParams.toString());
    if (team === "home") next.delete("team");
    else next.set("team", "away");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <div className="space-y-6">
      {/* Back + timezone */}
      <div className="flex items-center justify-between">
        <Link
          href={`/live?round=${roundId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent-light md:text-base"
        >
          <span>&larr;</span>
          <span>Round {roundId}</span>
        </Link>
        <TimezonePicker />
      </div>

      {/* Match header */}
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="min-w-0 truncate text-sm text-muted">{match.venueName}</div>
          <div className="shrink-0 text-right text-xs text-muted/80">
            {formatMatchDate(match.date, tz)}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <TeamLogo
                squadId={match.homeSquadId}
                teamName={match.homeSquadName}
                showFallback={false}
                className="hidden h-8 w-8 md:block"
              />
              <div
                className={`truncate text-xl font-bold leading-tight sm:text-3xl ${awayWon ? "text-muted/50" : ""}`}
              >
                {match.homeSquadName}
              </div>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2 px-2 sm:gap-4 sm:px-6">
            <span
              className={`text-3xl font-bold tabular-nums sm:text-4xl ${homeWon ? "text-accent-light" : awayWon ? "text-muted/50" : ""}`}
            >
              {match.homeScore}
            </span>
            <span className="text-xl text-muted">-</span>
            <span
              className={`text-3xl font-bold tabular-nums sm:text-4xl ${awayWon ? "text-accent-light" : homeWon ? "text-muted/50" : ""}`}
            >
              {match.awayScore}
            </span>
          </div>
          <div className="min-w-0 flex-1 text-right">
            <div className="flex items-center justify-end gap-2">
              <div
                className={`truncate text-xl font-bold leading-tight sm:text-3xl ${homeWon ? "text-muted/50" : ""}`}
              >
                {match.awaySquadName}
              </div>
              <TeamLogo
                squadId={match.awaySquadId}
                teamName={match.awaySquadName}
                showFallback={false}
                className="hidden h-8 w-8 md:block"
              />
            </div>
          </div>
        </div>

        <div className="mt-3 text-center text-sm text-muted/80">
          <div className="inline-flex items-center gap-2">
            {isPlaying && match.clock && (
              <span className="font-mono text-sm text-accent-light">
                {clockDisplay.label}
              </span>
            )}
            <span
              className={`rounded px-2.5 py-1 text-xs font-medium ${
                isPlaying
                  ? isAwaitingFullTime
                    ? "bg-amber-500/15 text-amber-300"
                    : "bg-danger/15 text-danger"
                  : "bg-surface-alt text-muted"
              }`}
            >
              {isPlaying
                ? isAwaitingFullTime
                  ? "FT Soon"
                  : "LIVE"
                : isComplete
                  ? "FT"
                  : <KickoffCountdown targetDate={match.date} />}
            </span>
          </div>
        </div>

      </div>

      {/* Player stats */}
      {isPreGame && (
        <div className="rounded-lg border border-border bg-surface">
          <TeamLineupsSection match={match} viewerTimeZone={tz} />
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface">
        <MatchStatsPanel
          homeSquadName={match.homeSquadName}
          awaySquadName={match.awaySquadName}
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
          matchStatus={match.status}
          selectedTeam={selectedTeam}
          onTeamChange={handleTeamChange}
          returnTo={`/live/${roundId}/${matchId}`}
          isLoading={statsLoading}
        />
      </div>
    </div>
  );
}

type TeamListPlayer = NonNullable<
  NonNullable<LiveMatch["teamList"]>["homePlayers"]
>[number];

const TEAM_LIST_RELEASE_TIMEZONE = "Pacific/Auckland";

function getZonedNowParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    weekday: weekdayMap[byType.weekday] ?? 0,
    year: Number(byType.year),
    month: Number(byType.month),
    day: Number(byType.day),
    hour: Number(byType.hour),
    minute: Number(byType.minute),
    second: Number(byType.second),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(byType.year),
    Number(byType.month) - 1,
    Number(byType.day),
    Number(byType.hour),
    Number(byType.minute),
    Number(byType.second),
  );
  return asUtc - date.getTime();
}

function zonedLocalToUtcDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const firstOffset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  let utcTs = utcGuess - firstOffset;
  const secondOffset = getTimeZoneOffsetMs(new Date(utcTs), timeZone);
  if (secondOffset !== firstOffset) {
    utcTs = utcGuess - secondOffset;
  }
  return new Date(utcTs);
}

function getNextTeamListUpdate(now: Date) {
  const zoned = getZonedNowParts(now, TEAM_LIST_RELEASE_TIMEZONE);
  let daysAhead = (2 - zoned.weekday + 7) % 7; // Tuesday = 2
  const isPastTodayCutoff =
    zoned.hour > 18 || (zoned.hour === 18 && zoned.minute >= 5);
  if (daysAhead === 0 && isPastTodayCutoff) {
    daysAhead = 7;
  }

  const targetLocalDate = new Date(Date.UTC(zoned.year, zoned.month - 1, zoned.day));
  targetLocalDate.setUTCDate(targetLocalDate.getUTCDate() + daysAhead);

  return zonedLocalToUtcDate(
    targetLocalDate.getUTCFullYear(),
    targetLocalDate.getUTCMonth() + 1,
    targetLocalDate.getUTCDate(),
    18,
    5,
    TEAM_LIST_RELEASE_TIMEZONE,
  );
}

function formatTeamListMoment(date: Date, timeZone: string, locale = "en-NZ") {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(date);
}

function TeamListExpectedTimer({ viewerTimeZone }: { viewerTimeZone: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const startId = window.setTimeout(tick, 0);
    const intervalId = window.setInterval(tick, 60_000);
    return () => {
      window.clearTimeout(startId);
      window.clearInterval(intervalId);
    };
  }, []);

  if (now == null) {
    return (
      <div className="rounded-lg border border-border/70 bg-surface-alt/30 p-4">
        <p className="text-sm font-semibold text-foreground">Named team lists not available yet</p>
        <p className="mt-1 text-sm text-muted">
          We publish them as soon as NRL updates are available.
        </p>
      </div>
    );
  }

  const target = getNextTeamListUpdate(new Date(now));
  const diff = target.getTime() - now;
  const expectedAt = formatTeamListMoment(target, viewerTimeZone);

  if (diff <= 0) {
    return (
      <div className="rounded-lg border border-border/70 bg-surface-alt/30 p-4">
        <p className="text-sm font-semibold text-foreground">Named team lists not available yet</p>
        <p className="mt-1 text-sm text-muted">
          Expected around {expectedAt}. We keep checking for late changes.
        </p>
      </div>
    );
  }

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${mins}m`);

  return (
    <div className="rounded-lg border border-border/70 bg-surface-alt/30 p-4">
      <p className="text-sm font-semibold text-foreground">Named team lists not available yet</p>
      <p className="mt-1 text-sm text-muted">
        Next expected update in{" "}
        <span className="font-semibold text-foreground">{parts.join(" ")}</span>
        .
      </p>
      <p className="mt-1 text-xs text-muted/90">Expected at {expectedAt}</p>
    </div>
  );
}

function toPlayerNumberMap(players: TeamListPlayer[]) {
  return new Map(
    players
      .filter((player) => player.number !== null)
      .map((player) => [player.number as number, player]),
  );
}

function getNameParts(player: TeamListPlayer) {
  const first = player.firstName?.trim() || "";
  const last = player.lastName?.trim() || "";
  if (first || last) return { first, last };
  const parts = player.displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "—", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function PlayerNameStack({
  player,
  align,
}: {
  player: TeamListPlayer | undefined;
  align: "left" | "right";
}) {
  if (!player) {
    return (
      <div className={`text-xs text-muted/50 ${align === "right" ? "text-right" : "text-left"}`}>
        —
      </div>
    );
  }

  const parts = getNameParts(player);
  const firstName = parts.first || "—";
  const lastName = parts.last;
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <div className="inline-flex max-w-full items-center gap-1 whitespace-nowrap overflow-hidden text-[11px] font-medium leading-tight md:text-xs [@media(min-width:1440px)]:text-base">
        <span className="text-muted/80">{firstName}</span>
        {lastName ? (
          <span className="font-semibold text-foreground">{lastName}</span>
        ) : null}
      </div>
    </div>
  );
}

function LineupNumberRow({
  number,
  homePlayer,
  awayPlayer,
}: {
  number: number;
  homePlayer: TeamListPlayer | undefined;
  awayPlayer: TeamListPlayer | undefined;
}) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)] items-center gap-1.5 py-0.5 md:grid-cols-[minmax(0,1fr)_2.3rem_minmax(0,1fr)] [@media(min-width:1440px)]:grid-cols-[minmax(0,1fr)_3.2rem_minmax(0,1fr)]">
      <PlayerNameStack player={homePlayer} align="left" />
      <div className="text-center">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-[10px] font-semibold text-accent-light md:h-6 md:w-6 md:text-[11px] [@media(min-width:1440px)]:h-8 [@media(min-width:1440px)]:w-8 [@media(min-width:1440px)]:text-sm">
          {number}
        </span>
      </div>
      <PlayerNameStack player={awayPlayer} align="right" />
    </li>
  );
}

function LineupSection({
  title,
  numbers,
  homeByNumber,
  awayByNumber,
}: {
  title: string;
  numbers: number[];
  homeByNumber: Map<number, TeamListPlayer>;
  awayByNumber: Map<number, TeamListPlayer>;
}) {
  if (numbers.length === 0) return null;

  return (
    <div className="space-y-0.5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 py-0.5">
        <div className="h-px bg-border/35" />
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted md:text-xs [@media(min-width:1440px)]:text-base">{title}</h3>
        <div className="h-px bg-border/35" />
      </div>
      <ul className="divide-y divide-border/35">
        {numbers.map((number) => (
          <LineupNumberRow
            key={number}
            number={number}
            homePlayer={homeByNumber.get(number)}
            awayPlayer={awayByNumber.get(number)}
          />
        ))}
      </ul>
    </div>
  );
}

function TeamLineupsSection({
  match,
  viewerTimeZone,
}: {
  match: LiveMatch;
  viewerTimeZone: string;
}) {
  const homePlayers = match.teamList?.homePlayers ?? [];
  const awayPlayers = match.teamList?.awayPlayers ?? [];
  const hasAny = homePlayers.length > 0 || awayPlayers.length > 0;
  const homeByNumber = toPlayerNumberMap(homePlayers);
  const awayByNumber = toPlayerNumberMap(awayPlayers);

  const reserveNumbers = Array.from(
    new Set(
      [...homeByNumber.keys(), ...awayByNumber.keys()]
        .filter((number) => number >= 18)
        .sort((a, b) => a - b),
    ),
  );
  const sections = [
    { title: "Backs", numbers: [1, 2, 3, 4, 5, 6, 7] },
    { title: "Forwards", numbers: [8, 9, 10, 11, 12, 13] },
    { title: "Interchange", numbers: [14, 15, 16, 17] },
    { title: "Reserves", numbers: reserveNumbers },
  ];

  return (
    <div className="space-y-2 p-3 md:p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold md:text-lg [@media(min-width:1440px)]:text-xl">Named Team Lists</h2>
        {match.teamList?.sourceUpdatedAt ? (
          <span className="text-xs text-muted [@media(min-width:1440px)]:text-sm">
            Updated {new Date(match.teamList.sourceUpdatedAt).toLocaleString()}
          </span>
        ) : null}
      </div>

      {hasAny ? (
        <div className="space-y-1.5">
          {sections.map((section) => (
            <LineupSection
              key={section.title}
              title={section.title}
              numbers={section.numbers}
              homeByNumber={homeByNumber}
              awayByNumber={awayByNumber}
            />
          ))}
        </div>
      ) : (
        <TeamListExpectedTimer viewerTimeZone={viewerTimeZone} />
      )}
    </div>
  );
}

function KickoffCountdown({ targetDate }: { targetDate: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const startId = window.setTimeout(tick, 0);
    const intervalId = window.setInterval(tick, 60_000);
    return () => {
      window.clearTimeout(startId);
      window.clearInterval(intervalId);
    };
  }, []);

  if (now == null) return <>Starts soon</>;

  const diff = new Date(targetDate).getTime() - now;
  if (diff <= 0) return <>Starts soon</>;

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${mins}m`);

  return <>Starts in {parts.join(" ")}</>;
}
