"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import type { FixtureStripItem } from "@nrl/types";

interface FixtureStripProps {
  fixtures: FixtureStripItem[];
  squadId: number;
}

function kickoffMs(value: string | null): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export function FixtureStrip({ fixtures, squadId }: FixtureStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLDivElement>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const currentRoundId = useMemo(() => {
    if (!fixtures || fixtures.length === 0) return null;
    for (let i = 0; i < fixtures.length; i++) {
      const kickoff = kickoffMs(fixtures[i].kickoffAt);
      if (kickoff != null && kickoff > nowMs) {
        return fixtures[i].roundId;
      }
    }
    return fixtures[fixtures.length - 1].roundId;
  }, [fixtures, nowMs]);

  useEffect(() => {
    if (currentRef.current) {
      currentRef.current.scrollIntoView({
        inline: "center",
        block: "nearest",
      });
    }
  }, [currentRoundId]);

  if (!fixtures || fixtures.length === 0) return null;

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
      <h2 className="text-xl font-bold">Fixtures</h2>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => scroll("left")}
          className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-foreground"
        >
          &#8249;
        </button>

        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none"
        >
          {fixtures.map((fixture, idx) => {
            const isHome = fixture.homeSquadId === squadId;
            const opponent = isHome ? fixture.awaySquad : fixture.homeSquad;
            const isCurrent = fixture.roundId === currentRoundId;
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
          className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-foreground"
        >
          &#8250;
        </button>
      </div>
    </div>
  );
}
