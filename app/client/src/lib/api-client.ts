function getRuntimeApiBase(): string {
  if (typeof window === "undefined") {
    return "http://localhost:3001";
  }

  const { hostname, origin, protocol } = window.location;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

  if (hostname.startsWith("api.")) {
    return origin;
  }

  if (isLocalhost) {
    return "http://localhost:3001";
  }

  return `${protocol}//api.${hostname}`;
}

function getApiBase(): string {
  const configuredBase = process.env.NEXT_PUBLIC_API_URL;

  if (!configuredBase) {
    return getRuntimeApiBase();
  }

  if (typeof window === "undefined") {
    return configuredBase;
  }

  const isConfiguredLocalhost =
    configuredBase.includes("localhost") || configuredBase.includes("127.0.0.1");
  const isBrowserLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  // Ignore dev-only API URLs when running from a real domain.
  if (isConfiguredLocalhost && !isBrowserLocalhost) {
    return getRuntimeApiBase();
  }

  return configuredBase;
}

const API_BASE = getApiBase();

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? "Request failed");
  }

  return res.json();
}
