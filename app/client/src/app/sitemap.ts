import type { MetadataRoute } from "next";
import { apiFetchServer } from "@/lib/api-server";
import { playerPath, teamPath } from "@/lib/entity-routes";

export const revalidate = 3600;

type TeamsResponse = {
  data: Array<{ squadId: number; name: string; fullName: string }>;
};

type PlayerSearchResponse = {
  data: Array<{ playerId: number; fullName: string }>;
  limit: number;
  offset: number;
};

function resolveSiteOrigin(): string {
  const fallback = "https://footybreakevens.com";
  const value = process.env.NEXT_PUBLIC_SITE_URL ?? fallback;

  try {
    return new URL(value).origin;
  } catch {
    return fallback;
  }
}

async function fetchTeamUrls(siteOrigin: string): Promise<string[]> {
  try {
    const payload = await apiFetchServer<TeamsResponse>("/api/teams", {
      next: { revalidate: 3600 },
    });
    if (!payload?.data?.length) return [];
    return payload.data.map((team) =>
      `${siteOrigin}${teamPath(team.squadId, team.fullName || team.name)}`,
    );
  } catch {
    return [];
  }
}

async function fetchPlayerUrls(siteOrigin: string): Promise<string[]> {
  const limit = 100;
  const maxPages = 20;
  const urls: string[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const offset = page * limit;
    let payload: PlayerSearchResponse | null = null;
    try {
      payload = await apiFetchServer<PlayerSearchResponse>(
        `/api/players/search?limit=${limit}&offset=${offset}&sort=avg_points&order=desc`,
        { next: { revalidate: 3600 } },
      );
    } catch {
      break;
    }

    if (!payload?.data?.length) break;

    for (const player of payload.data) {
      urls.push(`${siteOrigin}${playerPath(player.playerId, player.fullName)}`);
    }

    if (payload.data.length < limit) break;
  }

  return urls;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteOrigin = resolveSiteOrigin();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteOrigin}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteOrigin}/players`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteOrigin}/players/search`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteOrigin}/teams`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteOrigin}/live`,
      changeFrequency: "hourly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/byes`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/nrl-injury-ward`,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/nrl-fantasy-points-system`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/nrl-fantasy-breakevens`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteOrigin}/terms`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const [teamUrls, playerUrls] = await Promise.all([
    fetchTeamUrls(siteOrigin),
    fetchPlayerUrls(siteOrigin),
  ]);

  const dynamicRoutes: MetadataRoute.Sitemap = [
    ...teamUrls.map((url) => ({
      url,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...playerUrls.map((url) => ({
      url,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];

  return [...staticRoutes, ...dynamicRoutes];
}
