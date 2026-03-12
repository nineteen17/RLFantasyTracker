export function normalizeApiBase(base: string): string {
  return base.replace(/\/+$/, "");
}

export function toApiUrl(base: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizeApiBase(base)}${normalizedPath}`;
}
