function toSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeSlug(input: string, fallback: string): string {
  const slug = toSlug(input);
  return slug.length > 0 ? slug : fallback;
}

export function parseEntityId(segment: string): number {
  const match = segment.match(/^(\d+)(?:-[a-z0-9-]+)?$/i);
  if (!match) return NaN;
  const parsed = Number(match[1]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : NaN;
}

export function playerRouteSegment(playerId: number, fullName: string): string {
  return `${playerId}-${normalizeSlug(fullName, `player-${playerId}`)}`;
}

export function teamRouteSegment(squadId: number, teamName: string): string {
  return `${squadId}-${normalizeSlug(teamName, `team-${squadId}`)}`;
}

export function playerPath(playerId: number, fullName: string): string {
  return `/players/${playerRouteSegment(playerId, fullName)}`;
}

export function teamPath(squadId: number, teamName: string): string {
  return `/teams/${teamRouteSegment(squadId, teamName)}`;
}

export function isTeamRoutePath(value: string): boolean {
  return /^\/teams\/\d+(?:-[a-z0-9-]+)?$/i.test(value);
}
