import type { FixtureStripItem } from "@nrl/types";

interface FixtureStripProps {
  fixtures: FixtureStripItem[];
  byeRounds: number[];
  squadId: number;
}

type RoundCard =
  | { kind: "fixture"; roundId: number; fixture: FixtureStripItem }
  | { kind: "bye"; roundId: number };

export function FixtureStrip({ fixtures, byeRounds, squadId }: FixtureStripProps) {
  const normalizedByeRounds = [...new Set(byeRounds)].sort((a, b) => a - b);
  const byeRoundSet = new Set(normalizedByeRounds);

  const fixtureByRound = new Map<number, FixtureStripItem>();
  for (const fixture of fixtures) {
    if (!fixtureByRound.has(fixture.roundId)) {
      fixtureByRound.set(fixture.roundId, fixture);
    }
  }

  const roundIds = new Set<number>();
  for (const fixture of fixtures) roundIds.add(fixture.roundId);
  for (const roundId of normalizedByeRounds) roundIds.add(roundId);

  const roundCards: RoundCard[] = [...roundIds]
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

  if (roundCards.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-bold">Fixtures & Byes</h2>
      {normalizedByeRounds.length > 0 && (
        <p className="text-sm text-muted">
          Bye Rounds: {normalizedByeRounds.map((roundId) => `R${roundId}`).join(", ")}
        </p>
      )}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {roundCards.map((card) => {
          if (card.kind === "bye") {
            return (
              <div
                key={`bye-${card.roundId}`}
                className="flex min-w-[88px] flex-col items-center rounded-lg border border-warning/40 bg-warning/5 p-3"
              >
                <div className="text-xs text-muted">R{card.roundId}</div>
                <div className="mt-2 rounded bg-warning/20 px-2 py-0.5 text-xs font-semibold text-warning">
                  BYE
                </div>
              </div>
            );
          }

          const fixture = card.fixture;
          const isHome = fixture.homeSquadId === squadId;
          const opponent = isHome ? fixture.awaySquad : fixture.homeSquad;

          return (
            <div
              key={fixture.fixtureId ?? `fixture-${card.roundId}`}
              className="flex min-w-[88px] flex-col items-center rounded-lg border border-border bg-surface p-3"
            >
              <div className="text-xs text-muted">R{fixture.roundId}</div>
              <div className="mt-1 text-center text-sm font-medium">
                {isHome ? "vs" : "@"}
              </div>
              <div className="mt-1 text-center text-sm">
                {opponent?.shortName ?? opponent?.name ?? "TBD"}
              </div>
              {fixture.venue && (
                <div className="mt-1 text-xs text-muted">
                  {fixture.venue.name}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
