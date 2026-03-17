const BASE_URL = "https://fantasy.nrl.com/assets/media/squads/nrl/logos";

export function teamLogoUrl(squadId: number): string {
  return `${BASE_URL}/${squadId}.png`;
}
