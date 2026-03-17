import type { Metadata } from "next";
import Link from "next/link";
import { ErrorState } from "@/components/ui/error-state";
import { apiFetchServer } from "@/lib/api-server";
import { playerPath } from "@/lib/entity-routes";
import { playerImageUrl } from "@/lib/player-image";

type InjuryWardSearchParams = Record<string, string | string[] | undefined>;

type CasualtyWardEntry = {
  competitionId: number;
  playerUrl: string;
  firstName: string;
  lastName: string;
  teamNickname: string;
  injury: string;
  expectedReturn: string;
  imageUrl: string | null;
  sourceUpdatedAt: string;
  updatedAt: string | null;
};

type CasualtyWardResponse = {
  data: CasualtyWardEntry[];
};

type PlayerSearchEntry = {
  playerId: number;
  fullName: string;
  squadName: string | null;
  squadShortName: string | null;
};

type PlayerSearchResponse = {
  data: PlayerSearchEntry[];
  total: number;
  limit: number;
  offset: number;
};

type ResolvedCasualtyRow = {
  entry: CasualtyWardEntry;
  rowKey: string;
  playerId: number | null;
  href: string | null;
};

const DEFAULT_COMPETITION_ID = 111;

export const revalidate = 900;

export const metadata: Metadata = {
  title: "NRL Injury Ward",
  description:
    "Latest NRL injury and casualty updates with expected return windows.",
  alternates: {
    canonical: "/nrl-injury-ward",
  },
};

function readFirst(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function parsePositiveInt(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function equalsIgnoreCase(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function normalizeLookupValue(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function createEntryName(entry: CasualtyWardEntry): string {
  return `${entry.firstName} ${entry.lastName}`.trim();
}

function buildInjuryWardReturnPath(
  competitionId: number,
  team: string,
  expectedReturn: string,
): string {
  const params = new URLSearchParams();
  params.set("competition", String(competitionId));
  if (team) params.set("team", team);
  if (expectedReturn) params.set("expectedReturn", expectedReturn);
  return `/nrl-injury-ward?${params.toString()}`;
}

function buildPlayerProfileHref(href: string, returnToPath: string): string {
  const params = new URLSearchParams();
  params.set("returnTo", returnToPath);
  return `${href}?${params.toString()}`;
}

function buildPlayerLookup(players: PlayerSearchEntry[]): Map<string, PlayerSearchEntry[]> {
  const lookup = new Map<string, PlayerSearchEntry[]>();

  for (const player of players) {
    const key = normalizeLookupValue(player.fullName);
    if (!key) continue;
    const current = lookup.get(key) ?? [];
    current.push(player);
    lookup.set(key, current);
  }

  return lookup;
}

function resolvePlayer(
  entry: CasualtyWardEntry,
  lookup: Map<string, PlayerSearchEntry[]>,
): PlayerSearchEntry | null {
  const nameKey = normalizeLookupValue(createEntryName(entry));
  if (!nameKey) return null;

  const matches = lookup.get(nameKey) ?? [];
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0] ?? null;

  const teamKey = normalizeLookupValue(entry.teamNickname);
  if (!teamKey) return matches[0] ?? null;

  const matchedByTeam = matches.find((player) => {
    const squadNameKey = normalizeLookupValue(player.squadName ?? "");
    const squadShortNameKey = normalizeLookupValue(player.squadShortName ?? "");
    return (
      squadNameKey === teamKey ||
      squadShortNameKey === teamKey ||
      squadNameKey.includes(teamKey) ||
      teamKey.includes(squadNameKey) ||
      squadShortNameKey.includes(teamKey) ||
      teamKey.includes(squadShortNameKey)
    );
  });

  return matchedByTeam ?? matches[0] ?? null;
}

async function fetchCasualtyWardData(): Promise<CasualtyWardEntry[] | null> {
  try {
    const payload = await apiFetchServer<CasualtyWardResponse>("/api/casualty-ward", {
      next: { revalidate },
    });
    return payload?.data ?? [];
  } catch {
    return null;
  }
}

async function fetchPlayerDirectory(): Promise<PlayerSearchEntry[]> {
  const limit = 100;
  const maxPages = 25;
  const collected: PlayerSearchEntry[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const offset = page * limit;
    const payload = await apiFetchServer<PlayerSearchResponse>(
      `/api/players/search?limit=${limit}&offset=${offset}&sort=avg_points&order=desc`,
      {
        next: { revalidate },
      },
    );

    if (!payload?.data?.length) break;
    collected.push(...payload.data);

    const hasAllRows = payload.offset + payload.data.length >= payload.total;
    if (hasAllRows || payload.data.length < limit) break;
  }

  const deduped = new Map<number, PlayerSearchEntry>();
  for (const player of collected) {
    if (!deduped.has(player.playerId)) deduped.set(player.playerId, player);
  }

  return [...deduped.values()];
}

function InjuryAvatar({
  entry,
  playerId,
}: {
  entry: CasualtyWardEntry;
  playerId: number | null;
}) {
  const initials = `${entry.firstName.charAt(0)}${entry.lastName.charAt(0)}`.toUpperCase();

  if (!playerId) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-alt text-xs font-semibold text-muted">
        {initials}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={playerImageUrl(playerId, "sm")}
      alt={createEntryName(entry)}
      width={36}
      height={36}
      className="h-9 w-9 shrink-0 rounded-full border border-border object-cover object-top"
      loading="lazy"
    />
  );
}

export default async function InjuryWardPage({
  searchParams,
}: {
  searchParams: Promise<InjuryWardSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const competitionId = parsePositiveInt(
    readFirst(resolvedSearchParams.competition),
    DEFAULT_COMPETITION_ID,
  );
  const selectedTeam = readFirst(resolvedSearchParams.team).trim();
  const selectedExpectedReturn = readFirst(resolvedSearchParams.expectedReturn).trim();

  const entries = await fetchCasualtyWardData();
  if (entries == null) {
    return <ErrorState message="Unable to load injury data right now." />;
  }

  let playerLookup = new Map<string, PlayerSearchEntry[]>();
  try {
    const players = await fetchPlayerDirectory();
    playerLookup = buildPlayerLookup(players);
  } catch {
    playerLookup = new Map<string, PlayerSearchEntry[]>();
  }

  const rows: ResolvedCasualtyRow[] = entries.map((entry, index) => {
    const resolved = resolvePlayer(entry, playerLookup);
    return {
      entry,
      rowKey: `${entry.competitionId}-${entry.playerUrl}-${index}`,
      playerId: resolved?.playerId ?? null,
      href: resolved ? playerPath(resolved.playerId, resolved.fullName) : null,
    };
  });

  const teamOptions = [...new Set(rows.map((row) => row.entry.teamNickname))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  const expectedReturnOptions = [...new Set(rows.map((row) => row.entry.expectedReturn))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const filtered = rows.filter(({ entry }) => {
    if (entry.competitionId !== competitionId) return false;
    if (selectedTeam && !equalsIgnoreCase(entry.teamNickname, selectedTeam)) return false;
    if (
      selectedExpectedReturn &&
      !equalsIgnoreCase(entry.expectedReturn, selectedExpectedReturn)
    ) {
      return false;
    }
    return true;
  });
  const returnToPath = buildInjuryWardReturnPath(
    competitionId,
    selectedTeam,
    selectedExpectedReturn,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">NRL Injury Ward</h1>
          <p className="mt-2 text-muted">
            Track current injury status and expected return windows across the NRL.
          </p>
        </div>
      </div>

      <form
        method="get"
        className="grid gap-3 rounded-lg border border-border bg-surface p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-4"
      >
        <input type="hidden" name="competition" value={competitionId} />
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Team</span>
          <select
            name="team"
            defaultValue={selectedTeam}
            className="w-full rounded-md border border-border bg-bg px-2.5 py-2 text-sm"
          >
            <option value="">Any team</option>
            {teamOptions.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Expected Return
          </span>
          <select
            name="expectedReturn"
            defaultValue={selectedExpectedReturn}
            className="w-full rounded-md border border-border bg-bg px-2.5 py-2 text-sm"
          >
            <option value="">Any return window</option>
            {expectedReturnOptions.map((expectedReturn) => (
              <option key={expectedReturn} value={expectedReturn}>
                {expectedReturn}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-accent px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-accent-light"
          >
            Apply Filters
          </button>
          <Link
            href={`/nrl-injury-ward?competition=${competitionId}`}
            className="inline-flex items-center justify-center rounded-md border border-border px-3.5 py-2 text-sm text-muted transition hover:text-foreground"
          >
            Reset
          </Link>
        </div>
      </form>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
          No players match the selected filters.
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-border bg-surface md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Player</th>
                  <th className="px-4 py-3 font-semibold">Team</th>
                  <th className="px-4 py-3 font-semibold">Injury</th>
                  <th className="px-4 py-3 font-semibold">Expected Return</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ entry, rowKey, href, playerId }) => (
                  <tr key={rowKey} className="border-t border-border">
                    <td className="px-4 py-3">
                      {(() => {
                        const fullName = createEntryName(entry);

                        if (!href) {
                          return (
                            <div className="inline-flex items-center gap-2.5">
                              <InjuryAvatar entry={entry} playerId={playerId} />
                              <span className="font-medium">{fullName}</span>
                            </div>
                          );
                        }

                        return (
                          <Link
                            href={buildPlayerProfileHref(href, returnToPath)}
                            className="inline-flex items-center gap-2.5 hover:underline"
                          >
                            <InjuryAvatar entry={entry} playerId={playerId} />
                            <span className="font-medium">{fullName}</span>
                          </Link>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-muted">{entry.teamNickname}</td>
                    <td className="px-4 py-3">{entry.injury}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded bg-warning/20 px-2 py-1 text-xs font-semibold text-warning">
                        {entry.expectedReturn}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {filtered.map(({ entry, rowKey, href, playerId }) => (
              <article
                key={rowKey}
                className="rounded-lg border border-border bg-surface p-3"
              >
                {(() => {
                  const fullName = createEntryName(entry);

                  if (!href) {
                    return (
                      <div className="inline-flex items-center gap-2.5">
                        <InjuryAvatar entry={entry} playerId={playerId} />
                        <div>
                          <p className="text-sm font-semibold">{fullName}</p>
                          <p className="text-xs text-muted">{entry.teamNickname}</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <Link
                      href={buildPlayerProfileHref(href, returnToPath)}
                      className="inline-flex items-center gap-2.5 hover:underline"
                    >
                      <InjuryAvatar entry={entry} playerId={playerId} />
                      <div>
                        <p className="text-sm font-semibold">{fullName}</p>
                        <p className="text-xs text-muted">{entry.teamNickname}</p>
                      </div>
                    </Link>
                  );
                })()}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border border-border bg-bg/40 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted">Injury</p>
                    <p className="mt-1 font-medium">{entry.injury}</p>
                  </div>
                  <div className="rounded border border-border bg-bg/40 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted">Return</p>
                    <p className="mt-1 font-medium">{entry.expectedReturn}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
