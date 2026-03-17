import type { Metadata } from "next";
import { Suspense, cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import type {
  PlayerDetailResponse,
  PlayerHistoryResponse,
  TeamsListResponse,
} from "@nrl/types";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { POSITION_FULL_LABELS } from "@/lib/constants";
import { parseEntityId, playerPath, teamPath } from "@/lib/entity-routes";
import { ServerApiError, apiFetchServer } from "@/lib/api-server";
import { serializeJsonLd } from "@/lib/json-ld";
import type { PlayerInjuryUpdate } from "./injury-update";
import PlayerPageClient from "./player-page-client";

type PlayerPageSearchParams = Record<string, string | string[] | undefined>;

type VenuesResponse = {
  data: Array<{
    venueId: number;
    name: string;
    shortName: string | null;
  }>;
};

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

export const revalidate = 300;

type JsonLdObject = Record<string, unknown>;

function parsePlayerId(raw: string): number {
  return parseEntityId(raw);
}

function parseIncludePreseason(value: string | string[] | undefined): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
}

function toQueryString(searchParams: PlayerPageSearchParams): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const entry of value) params.append(key, entry);
      continue;
    }
    params.set(key, value);
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function resolveSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "https://footybreakevens.com";
  try {
    return new URL(raw).origin;
  } catch {
    return "https://footybreakevens.com";
  }
}

function toAbsoluteUrl(path: string): string {
  return new URL(path, resolveSiteOrigin()).toString();
}

function normalizeLookupValue(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function resolveInjuryUpdate(
  fullName: string,
  squadName: string,
  squadShortName: string | null,
  casualties: CasualtyWardEntry[] | undefined,
  status: string | null,
): PlayerInjuryUpdate | null {
  const normalizedName = normalizeLookupValue(fullName);
  if (!normalizedName) return status === "injured" ? { injury: "Injured", expectedReturn: null } : null;

  const matches = (casualties ?? []).filter((entry) => {
    const entryName = normalizeLookupValue(`${entry.firstName} ${entry.lastName}`);
    return entryName === normalizedName;
  });

  const teamKeyCandidates = [squadShortName ?? "", squadName]
    .map((value) => normalizeLookupValue(value))
    .filter(Boolean);
  const match =
    matches.length <= 1
      ? matches[0]
      : matches.find((entry) => {
          const teamKey = normalizeLookupValue(entry.teamNickname);
          return teamKeyCandidates.some(
            (candidate) =>
              teamKey === candidate ||
              teamKey.includes(candidate) ||
              candidate.includes(teamKey),
          );
        }) ?? matches[0];

  if (match) {
    const injury = match.injury?.trim() || "Injured";
    const expectedReturn = match.expectedReturn?.trim() || null;
    return { injury, expectedReturn };
  }

  if (status === "injured") {
    return { injury: "Injured", expectedReturn: null };
  }

  return null;
}

function toPropertyValue(
  name: string,
  value: string | number | null | undefined,
): JsonLdObject | null {
  if (value == null || value === "") return null;
  return {
    "@type": "PropertyValue",
    name,
    value,
  };
}

const fetchPlayerDetail = cache(async (playerId: number): Promise<PlayerDetailResponse> => {
  return apiFetchServer<PlayerDetailResponse>(`/api/players/${playerId}`, {
    next: { revalidate },
  });
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ player_id: string }>;
}): Promise<Metadata> {
  const { player_id } = await params;
  const playerId = parsePlayerId(player_id);

  if (!Number.isFinite(playerId)) {
    return { title: "Player" };
  }

  try {
    const data = await fetchPlayerDetail(playerId);
    const playerName = data.player.fullName;
    const squadName = data.player.squad.shortName ?? data.player.squad.name;
    return {
      title: `${playerName} Fantasy Stats and Break Evens`,
      description: `${playerName} (${squadName}) NRL Fantasy stats, scoring trends, break evens, projections, and matchups.`,
      alternates: {
        canonical: playerPath(playerId, playerName),
      },
    };
  } catch {
    return {
      title: "Player",
      alternates: {
        canonical: `/players/${playerId}`,
      },
    };
  }
}

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ player_id: string }>;
  searchParams: Promise<PlayerPageSearchParams>;
}) {
  const [{ player_id }, query] = await Promise.all([params, searchParams]);
  const playerId = parsePlayerId(player_id);
  if (!Number.isFinite(playerId)) {
    notFound();
  }

  const includePreseason = parseIncludePreseason(query.preseason);

  const [playerResult, historyResult, teamsResult, venuesResult, casualtyResult] =
    await Promise.allSettled([
      fetchPlayerDetail(playerId),
      apiFetchServer<PlayerHistoryResponse>(
        `/api/players/${playerId}/history?includePreseason=${includePreseason}`,
        { next: { revalidate: 60 } },
      ),
      apiFetchServer<TeamsListResponse>("/api/teams", {
        next: { revalidate },
      }),
      apiFetchServer<VenuesResponse>("/api/venues", {
        next: { revalidate },
      }),
      apiFetchServer<CasualtyWardResponse>("/api/casualty-ward?competition=111", {
        next: { revalidate: 900 },
      }),
    ]);

  if (playerResult.status === "rejected") {
    if (
      playerResult.reason instanceof ServerApiError &&
      playerResult.reason.status === 404
    ) {
      notFound();
    }
    return <ErrorState message="Unable to load player details right now." />;
  }

  const initialPlayerData = playerResult.value;
  const initialHistoryData =
    historyResult.status === "fulfilled" ? historyResult.value : undefined;
  const initialTeamsData =
    teamsResult.status === "fulfilled" ? teamsResult.value : undefined;
  const initialVenuesData =
    venuesResult.status === "fulfilled" ? venuesResult.value : undefined;
  const casualties =
    casualtyResult.status === "fulfilled" ? casualtyResult.value.data : undefined;

  const player = initialPlayerData.player;
  const injuryUpdate = resolveInjuryUpdate(
    player.fullName,
    player.squad.name,
    player.squad.shortName,
    casualties,
    player.status,
  );
  const canonicalPlayerPath = playerPath(player.playerId, player.fullName);
  const incomingPath = `/players/${player_id}`;
  if (incomingPath !== canonicalPlayerPath) {
    permanentRedirect(`${canonicalPlayerPath}${toQueryString(query)}`);
  }

  const current = initialPlayerData.current;
  const playerUrl = toAbsoluteUrl(canonicalPlayerPath);
  const teamUrl = toAbsoluteUrl(
    teamPath(player.squad.squadId, player.squad.shortName ?? player.squad.name),
  );
  const teamName = player.squad.shortName ?? player.squad.name;
  const positions = player.positions
    .map((positionId) => POSITION_FULL_LABELS[positionId] ?? `Position ${positionId}`)
    .join(", ");

  const additionalProperty = [
    toPropertyValue("Fantasy Price", player.cost),
    toPropertyValue("Average Fantasy Points", current?.avgPoints ?? null),
    toPropertyValue("Games Played", current?.gamesPlayed ?? null),
    toPropertyValue("Total Fantasy Points", current?.totalPoints ?? null),
    toPropertyValue("Ownership", current?.ownedBy ?? null),
    toPropertyValue("Positions", positions),
  ].filter((entry): entry is JsonLdObject => entry !== null);

  const playerJsonLd: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${player.fullName} Fantasy Stats`,
    url: playerUrl,
    mainEntity: {
      "@type": "Person",
      name: player.fullName,
      url: playerUrl,
      jobTitle: "Rugby League Player",
      memberOf: {
        "@type": "SportsTeam",
        name: teamName,
        url: teamUrl,
        sport: "Rugby League",
      },
      additionalProperty,
    },
    isPartOf: {
      "@type": "WebSite",
      name: "Footy Break Evens",
      url: resolveSiteOrigin(),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(playerJsonLd) }}
      />
      <Suspense
        fallback={
          <div className="space-y-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-10" />
            <div className="grid gap-6 lg:grid-cols-2">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          </div>
        }
      >
        <PlayerPageClient
          playerId={playerId}
          initialPlayerData={initialPlayerData}
          initialHistoryData={initialHistoryData}
          initialHistoryIncludePreseason={includePreseason}
          initialTeamsData={initialTeamsData}
          initialVenuesData={initialVenuesData}
          initialInjuryUpdate={injuryUpdate}
        />
      </Suspense>
    </>
  );
}
