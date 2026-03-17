"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface InjuryWardFiltersProps {
  competitionId: number;
  selectedTeam: string;
  selectedExpectedReturn: string;
  teamOptions: string[];
  expectedReturnOptions: string[];
}

const FILTER_SELECT_CLASS =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-inherit focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";
const FILTER_ACTION_CLASS =
  "inline-flex w-full items-center justify-center rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-foreground";

function buildFilterQuery(
  competitionId: number,
  team: string,
  expectedReturn: string,
): string {
  const params = new URLSearchParams();
  params.set("competition", String(competitionId));
  if (team) params.set("team", team);
  if (expectedReturn) params.set("expectedReturn", expectedReturn);
  return params.toString();
}

export function InjuryWardFilters({
  competitionId,
  selectedTeam,
  selectedExpectedReturn,
  teamOptions,
  expectedReturnOptions,
}: InjuryWardFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  const pushFilters = (team: string, expectedReturn: string) => {
    const query = buildFilterQuery(competitionId, team, expectedReturn);
    router.push(`${pathname}?${query}`);
  };

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <select
        name="team"
        value={selectedTeam}
        onChange={(event) => pushFilters(event.target.value, selectedExpectedReturn)}
        className={FILTER_SELECT_CLASS}
      >
        <option value="">All Teams</option>
        {teamOptions.map((team) => (
          <option key={team} value={team}>
            {team}
          </option>
        ))}
      </select>

      <select
        name="expectedReturn"
        value={selectedExpectedReturn}
        onChange={(event) => pushFilters(selectedTeam, event.target.value)}
        className={FILTER_SELECT_CLASS}
      >
        <option value="">All Return Windows</option>
        {expectedReturnOptions.map((expectedReturn) => (
          <option key={expectedReturn} value={expectedReturn}>
            {expectedReturn}
          </option>
        ))}
      </select>

      <div className="flex items-end">
        <Link href={`${pathname}?competition=${competitionId}`} className={FILTER_ACTION_CLASS}>
          Clear All
        </Link>
      </div>
    </div>
  );
}
