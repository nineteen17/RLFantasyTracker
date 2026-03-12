import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { TeamDetailResponse } from "@nrl/types";
import { POSITION_FULL_LABELS } from "@/lib/constants";
import { ErrorState } from "@/components/ui/error-state";
import { ServerApiError, apiFetchServer } from "@/lib/api-server";
import {
  parseEntityId,
  playerPath,
  teamPath,
} from "@/lib/entity-routes";
import { serializeJsonLd } from "@/lib/json-ld";
import { TeamHeader } from "./components/team-header";
import { RosterGrid } from "./components/roster-grid";
import { FixtureStrip } from "./components/fixture-strip";

export const revalidate = 300;

type JsonLdObject = Record<string, unknown>;

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

type TeamPageSearchParams = Record<string, string | string[] | undefined>;

function toQueryString(searchParams: TeamPageSearchParams): string {
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

const fetchTeamDetail = cache(async (squadId: number): Promise<TeamDetailResponse> => {
  return apiFetchServer<TeamDetailResponse>(`/api/teams/${squadId}`, {
    next: { revalidate },
  });
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ squad_id: string }>;
}): Promise<Metadata> {
  const { squad_id } = await params;
  const squadId = parseEntityId(squad_id);
  if (!Number.isFinite(squadId)) {
    return {
      title: "Team",
    };
  }

  try {
    const data = await fetchTeamDetail(squadId);
    const teamName = data.data.fullName || data.data.name;
    return {
      title: `${teamName} Team Stats and Roster`,
      description: `View ${teamName} roster, fixtures, bye rounds, and player fantasy stats.`,
      alternates: {
        canonical: teamPath(squadId, teamName),
      },
    };
  } catch {
    return {
      title: "Team",
      alternates: {
        canonical: `/teams/${squadId}`,
      },
    };
  }
}

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ squad_id: string }>;
  searchParams: Promise<TeamPageSearchParams>;
}) {
  const [{ squad_id }, query] = await Promise.all([params, searchParams]);
  const squadId = parseEntityId(squad_id);

  if (!Number.isFinite(squadId)) {
    notFound();
  }

  let data: TeamDetailResponse;
  try {
    data = await fetchTeamDetail(squadId);
  } catch (error) {
    if (error instanceof ServerApiError && error.status === 404) {
      notFound();
    }
    return <ErrorState message="Unable to load team details right now." />;
  }

  const team = data.data;
  const teamName = team.fullName || team.name;
  const canonicalTeamPath = teamPath(squadId, teamName);
  const incomingPath = `/teams/${squad_id}`;
  if (incomingPath !== canonicalTeamPath) {
    permanentRedirect(`${canonicalTeamPath}${toQueryString(query)}`);
  }

  const teamUrl = toAbsoluteUrl(canonicalTeamPath);
  const playersItemList = team.roster.map((player, index) => ({
    "@type": "ListItem",
    position: index + 1,
    item: {
      "@type": "Person",
      name: player.fullName,
      url: toAbsoluteUrl(playerPath(player.playerId, player.fullName)),
    },
  }));

  const teamJsonLd: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: teamName,
    alternateName: team.shortName ?? undefined,
    url: teamUrl,
    sport: "Rugby League",
    athlete: team.roster.map((player) => ({
      "@type": "Person",
      name: player.fullName,
      url: toAbsoluteUrl(playerPath(player.playerId, player.fullName)),
      roleName: player.positions
        .map((positionId) => POSITION_FULL_LABELS[positionId] ?? `Position ${positionId}`)
        .join(", "),
    })),
  };

  const rosterJsonLd: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${teamName} Fantasy Roster`,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: playersItemList.length,
    itemListElement: playersItemList,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(teamJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(rosterJsonLd) }}
      />
      <div className="space-y-8">
        <Link
          href="/teams"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent-light md:text-base"
        >
          <span>&larr;</span>
          <span>Back to Teams</span>
        </Link>
        <TeamHeader team={team} />
        <FixtureStrip
          fixtures={team.fixtureStrip}
          byeRounds={team.byeRounds}
          squadId={squadId}
          teamName={team.shortName ?? team.name}
        />
        <RosterGrid
          roster={team.roster}
          squadId={squadId}
          teamName={teamName}
        />
      </div>
    </>
  );
}
