"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import type { FixtureStripItem } from "@nrl/types";

export interface FixtureStripProps {
  fixtures: FixtureStripItem[];
  byeRounds: number[];
  squadId: number;
  showFullDrawModal?: boolean;
  teamName?: string | null;
}

function kickoffMs(value: string | null): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function formatKickoff(value: string | null): string {
  const ms = kickoffMs(value);
  if (ms == null) return "TBD";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ms));
}

type RoundCard =
  | { kind: "fixture"; roundId: number; fixture: FixtureStripItem }
  | { kind: "bye"; roundId: number };

interface DrawRow {
  roundId: number;
  kind: "fixture" | "bye";
  opponent: string;
  homeAway: "H" | "A" | "-";
  venue: string;
  kickoff: string;
}

export function FixtureStrip({
  fixtures,
  byeRounds,
  squadId,
  showFullDrawModal = false,
  teamName,
}: FixtureStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLDivElement>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isDrawOpen, setIsDrawOpen] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!isDrawOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDrawOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isDrawOpen]);

  const normalizedByeRounds = useMemo(
    () => [...new Set(byeRounds)].sort((a, b) => a - b),
    [byeRounds],
  );
  const byeRoundSet = useMemo(
    () => new Set(normalizedByeRounds),
    [normalizedByeRounds],
  );

  const roundCards = useMemo<RoundCard[]>(() => {
    const fixtureByRound = new Map<number, FixtureStripItem>();
    for (const fixture of fixtures) {
      if (!fixtureByRound.has(fixture.roundId)) {
        fixtureByRound.set(fixture.roundId, fixture);
      }
    }

    const roundIds = new Set<number>();
    for (const fixture of fixtures) roundIds.add(fixture.roundId);
    for (const roundId of normalizedByeRounds) roundIds.add(roundId);

    return [...roundIds]
      .sort((a, b) => a - b)
      .map((roundId) => {
        const fixture = fixtureByRound.get(roundId);
        if (fixture) {
          return { kind: "fixture", roundId, fixture };
        }
        if (byeRoundSet.has(roundId)) {
          return { kind: "bye", roundId };
        }
        return { kind: "bye", roundId };
      });
  }, [fixtures, byeRoundSet, normalizedByeRounds]);

  const currentRoundId = useMemo(() => {
    if (!fixtures || fixtures.length === 0) {
      return roundCards.length > 0 ? roundCards[roundCards.length - 1].roundId : null;
    }
    for (let i = 0; i < fixtures.length; i++) {
      const kickoff = kickoffMs(fixtures[i].kickoffAt);
      if (kickoff != null && kickoff > nowMs) {
        return fixtures[i].roundId;
      }
    }
    return fixtures[fixtures.length - 1].roundId;
  }, [fixtures, nowMs, roundCards]);

  const drawRows = useMemo<DrawRow[]>(() => {
    return roundCards.map((card) => {
      if (card.kind === "bye") {
        return {
          roundId: card.roundId,
          kind: "bye",
          opponent: "BYE",
          homeAway: "-",
          venue: "-",
          kickoff: "-",
        };
      }

      const isHome = card.fixture.homeSquadId === squadId;
      const opponent = isHome ? card.fixture.awaySquad : card.fixture.homeSquad;

      return {
        roundId: card.roundId,
        kind: "fixture",
        opponent: opponent?.shortName ?? opponent?.name ?? "TBD",
        homeAway: isHome ? "H" : "A",
        venue: card.fixture.venue?.name ?? "-",
        kickoff: formatKickoff(card.fixture.kickoffAt),
      };
    });
  }, [roundCards, squadId]);

  useEffect(() => {
    if (currentRef.current) {
      currentRef.current.scrollIntoView({
        inline: "center",
        block: "nearest",
      });
    }
  }, [currentRoundId]);

  if (roundCards.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.6;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Fixtures & Byes</h2>
        {showFullDrawModal && (
          <button
            type="button"
            onClick={() => setIsDrawOpen(true)}
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground md:text-sm"
          >
            Full Draw
          </button>
        )}
      </div>
      {normalizedByeRounds.length > 0 && (
        <p className="text-sm text-muted">
          Bye Planner: {normalizedByeRounds.map((roundId) => `R${roundId}`).join(", ")}
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => scroll("left")}
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-foreground sm:flex"
        >
          &#8249;
        </button>

        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none"
        >
          {roundCards.map((card, idx) => {
            if (card.kind === "bye") {
              const isCurrent = card.roundId === currentRoundId;
              const isPast = currentRoundId != null && card.roundId < currentRoundId;

              return (
                <div
                  key={`bye-${card.roundId}-${idx}`}
                  ref={isCurrent ? currentRef : undefined}
                  className={`flex min-w-[90px] flex-col items-center rounded-lg border p-3 transition-colors ${
                    isCurrent
                      ? "border-warning bg-warning/10"
                      : isPast
                        ? "border-border/50 bg-surface opacity-60"
                        : "border-warning/40 bg-warning/5"
                  }`}
                >
                  <div className={`text-xs font-medium ${isCurrent ? "text-warning" : "text-muted"}`}>
                    R{card.roundId}
                  </div>
                  <div className="mt-2 rounded bg-warning/20 px-2 py-0.5 text-xs font-semibold text-warning">
                    BYE
                  </div>
                  <div className="mt-1 text-center text-xs text-muted">No fixture</div>
                </div>
              );
            }

            const fixture = card.fixture;
            const isHome = fixture.homeSquadId === squadId;
            const opponent = isHome ? fixture.awaySquad : fixture.homeSquad;
            const isCurrent = card.roundId === currentRoundId;
            const kickoff = kickoffMs(fixture.kickoffAt);
            const isPast = kickoff != null && kickoff < nowMs && !isCurrent;

            return (
              <div
                key={fixture.fixtureId ?? idx}
                ref={isCurrent ? currentRef : undefined}
                className={`flex min-w-[90px] flex-col items-center rounded-lg border p-3 transition-colors ${
                  isCurrent
                    ? "border-accent-light bg-accent-light/10"
                    : isPast
                      ? "border-border/50 bg-surface opacity-60"
                      : "border-border bg-surface"
                }`}
              >
                <div className={`text-xs font-medium ${isCurrent ? "text-accent-light" : "text-muted"}`}>
                  R{fixture.roundId}
                </div>
                <div className="mt-1 text-center text-sm font-medium">
                  {isHome ? "vs" : "@"}
                </div>
                <div className="mt-1 text-center text-sm">
                  {opponent?.shortName ?? opponent?.name ?? "TBD"}
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scroll("right")}
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-foreground sm:flex"
        >
          &#8250;
        </button>
      </div>

      {showFullDrawModal && isDrawOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close full draw"
            className="absolute inset-0 bg-black/55"
            onClick={() => setIsDrawOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Full draw table"
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[min(960px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="text-base font-semibold md:text-lg">
                  {teamName ? `${teamName} Full Draw` : "Full Draw"}
                </h3>
                <p className="text-xs text-muted md:text-sm">
                  Rounds in chronological order with byes included
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawOpen(false)}
                className="rounded-md border border-border bg-surface-alt px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground md:text-sm"
              >
                Close
              </button>
            </div>

            <div className="max-h-[calc(85vh-76px)] overflow-y-auto p-3 sm:p-4">
              <div className="space-y-2 sm:hidden">
                {drawRows.map((row) => {
                  const isCurrent = row.roundId === currentRoundId;
                  return (
                    <div
                      key={`draw-mobile-${row.roundId}-${row.kind}`}
                      className={`rounded-lg border p-3 ${
                        row.kind === "bye"
                          ? "border-warning/40 bg-warning/5"
                          : isCurrent
                            ? "border-accent-light bg-accent-light/10"
                            : "border-border bg-surface-alt/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">R{row.roundId}</div>
                        {isCurrent && (
                          <span className="rounded bg-accent-light/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-light">
                            Next
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm">
                        {row.kind === "bye" ? "BYE" : `${row.homeAway} vs ${row.opponent}`}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {row.kind === "bye" ? "No fixture" : `${row.kickoff} | ${row.venue}`}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[740px] border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr className="bg-surface-alt text-left text-muted">
                      <th className="sticky top-0 border-b border-border px-3 py-2 font-medium">Round</th>
                      <th className="sticky top-0 border-b border-border px-3 py-2 font-medium">Type</th>
                      <th className="sticky top-0 border-b border-border px-3 py-2 font-medium">Opponent</th>
                      <th className="sticky top-0 border-b border-border px-3 py-2 font-medium">Kickoff</th>
                      <th className="sticky top-0 border-b border-border px-3 py-2 font-medium">Venue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drawRows.map((row) => {
                      const isCurrent = row.roundId === currentRoundId;
                      return (
                        <tr
                          key={`draw-desktop-${row.roundId}-${row.kind}`}
                          className={
                            row.kind === "bye"
                              ? "bg-warning/5"
                              : isCurrent
                                ? "bg-accent-light/10"
                                : ""
                          }
                        >
                          <td className="border-b border-border px-3 py-2">
                            <div className="inline-flex items-center gap-2">
                              <span className="font-medium">R{row.roundId}</span>
                              {isCurrent && (
                                <span className="rounded bg-accent-light/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-light">
                                  Next
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="border-b border-border px-3 py-2 font-medium">
                            {row.kind === "bye" ? "BYE" : row.homeAway}
                          </td>
                          <td className="border-b border-border px-3 py-2">
                            {row.kind === "bye" ? "-" : row.opponent}
                          </td>
                          <td className="border-b border-border px-3 py-2">
                            {row.kind === "bye" ? "-" : row.kickoff}
                          </td>
                          <td className="border-b border-border px-3 py-2">
                            {row.kind === "bye" ? "-" : row.venue}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
