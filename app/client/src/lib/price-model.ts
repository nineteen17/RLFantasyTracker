const DEFAULT_PRICE_PER_POINT = 12733;
const DEFAULT_FANTASY_PRICE_FLOOR = 230000;

interface PriceModelOptions {
  pricePerPoint?: number;
  floorPrice?: number;
}

function resolvePricePerPoint(options?: PriceModelOptions): number {
  const candidate = options?.pricePerPoint;
  if (candidate == null || !Number.isFinite(candidate) || candidate <= 0) {
    return DEFAULT_PRICE_PER_POINT;
  }
  return candidate;
}

function resolveFloorPrice(options?: PriceModelOptions): number {
  const candidate = options?.floorPrice;
  if (candidate == null || !Number.isFinite(candidate) || candidate <= 0) {
    return DEFAULT_FANTASY_PRICE_FLOOR;
  }
  return candidate;
}

export function estimatePriceFromAverage(
  averagePoints: number,
  options?: PriceModelOptions,
): number {
  const floorPrice = resolveFloorPrice(options);
  const pricePerPoint = resolvePricePerPoint(options);
  if (!Number.isFinite(averagePoints) || averagePoints <= 0) {
    return floorPrice;
  }

  const projected = Math.round(averagePoints * pricePerPoint);
  return Math.max(floorPrice, projected);
}

export function estimateAverageFromPrice(
  price: number,
  options?: PriceModelOptions,
): number {
  const floorPrice = resolveFloorPrice(options);
  const pricePerPoint = resolvePricePerPoint(options);
  if (!Number.isFinite(price) || price <= 0) {
    return floorPrice / pricePerPoint;
  }

  const effectivePrice = Math.max(price, floorPrice);
  return effectivePrice / pricePerPoint;
}

export const priceModelConstants = {
  pricePerPoint: DEFAULT_PRICE_PER_POINT,
  floorPrice: DEFAULT_FANTASY_PRICE_FLOOR,
};
