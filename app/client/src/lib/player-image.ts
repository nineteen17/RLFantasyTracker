const BASE_URL = "https://fantasy.nrl.com/assets/media/players/nrl";

export function playerImageUrl(playerId: number, size: "sm" | "lg" = "sm"): string {
  const suffix = size === "lg" ? "450" : "100";
  return `${BASE_URL}/${playerId}_${suffix}.webp`;
}
