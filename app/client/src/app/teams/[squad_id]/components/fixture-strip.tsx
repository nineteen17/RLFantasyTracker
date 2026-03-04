import type { FixtureStripItem } from "@nrl/types";

interface FixtureStripProps {
  fixtures: FixtureStripItem[];
  squadId: number;
}

export function FixtureStrip({ fixtures, squadId }: FixtureStripProps) {
  if (fixtures.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* <h2 className="text-xl font-bold">Fixture Strip</h2> */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {fixtures.map((fixture) => {
          const isHome = fixture.homeSquadId === squadId;
          const opponent = isHome ? fixture.awaySquad : fixture.homeSquad;

          return (
            <div
              key={fixture.fixtureId}
              className="flex min-w-[100px] flex-col items-center rounded-lg border border-border bg-surface p-3"
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
