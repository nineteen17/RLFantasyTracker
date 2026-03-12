import type { SearchQuery } from "@nrl/types";

type QueryValue = string | string[] | null | undefined;
type QueryGetter = (key: string) => QueryValue;

const VALID_SORT_FIELDS = new Set<SearchQuery["sort"]>([
  "avg_points",
  "price",
  "owned_by",
  "ppm_season",
  "base_avg",
  "break_evens",
]);

const VALID_SORT_ORDERS = new Set<SearchQuery["order"]>(["asc", "desc"]);

export type PlayerSearchFilters = Pick<SearchQuery, "sort" | "order" | "limit" | "offset"> &
  Partial<Pick<SearchQuery, "q" | "squad_id" | "position" | "status">>;

function firstValue(value: QueryValue): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function parsePositiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseNonNegativeInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

export function parseSearchFilters(getValue: QueryGetter): PlayerSearchFilters {
  const q = firstValue(getValue("q"))?.trim() || undefined;
  const squadId = parsePositiveInt(firstValue(getValue("squad_id")));
  const position = parsePositiveInt(firstValue(getValue("position")));
  const status = firstValue(getValue("status"))?.trim() || undefined;

  const sortCandidate = firstValue(getValue("sort"));
  const orderCandidate = firstValue(getValue("order"));
  const limit = parsePositiveInt(firstValue(getValue("limit"))) ?? 25;
  const offset = parseNonNegativeInt(firstValue(getValue("offset"))) ?? 0;

  const sort = VALID_SORT_FIELDS.has(sortCandidate as SearchQuery["sort"])
    ? (sortCandidate as SearchQuery["sort"])
    : "avg_points";
  const order = VALID_SORT_ORDERS.has(orderCandidate as SearchQuery["order"])
    ? (orderCandidate as SearchQuery["order"])
    : "desc";

  return {
    q,
    squad_id: squadId,
    position,
    status,
    sort,
    order,
    limit,
    offset,
  };
}

export function buildSearchParams(filters: PlayerSearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.squad_id) params.set("squad_id", String(filters.squad_id));
  if (filters.position) params.set("position", String(filters.position));
  if (filters.status) params.set("status", filters.status);
  if (filters.sort !== "avg_points") params.set("sort", filters.sort);
  if (filters.order !== "desc") params.set("order", filters.order);
  if (filters.limit !== 25) params.set("limit", String(filters.limit));
  if (filters.offset > 0) params.set("offset", String(filters.offset));
  return params;
}

export function areSearchFiltersEqual(
  left: PlayerSearchFilters,
  right: PlayerSearchFilters,
): boolean {
  return (
    left.q === right.q &&
    left.squad_id === right.squad_id &&
    left.position === right.position &&
    left.status === right.status &&
    left.sort === right.sort &&
    left.order === right.order &&
    left.limit === right.limit &&
    left.offset === right.offset
  );
}
