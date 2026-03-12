import "server-only";
import { toApiUrl } from "@/lib/api-url";

export class ServerApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ServerApiError";
  }
}

export type ServerApiFetchInit = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
};

export function resolveServerApiBase(): string {
  const internalBase = process.env.API_INTERNAL_BASE_URL?.trim();
  if (internalBase) return internalBase;

  const publicBase = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (publicBase) return publicBase;

  return "http://localhost:3001";
}

export async function apiFetchServer<T>(
  path: string,
  init: ServerApiFetchInit = {},
): Promise<T> {
  const base = resolveServerApiBase();
  const url = toApiUrl(base, path);
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  const res = await fetch(url, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : "Request failed";
    throw new ServerApiError(res.status, message);
  }

  return (await res.json()) as T;
}
