import type { MetadataRoute } from "next";

function resolveSiteOrigin(): string {
  const fallback = "https://footybreakevens.com";
  const value = process.env.NEXT_PUBLIC_SITE_URL ?? fallback;

  try {
    return new URL(value).origin;
  } catch {
    return fallback;
  }
}

export default function robots(): MetadataRoute.Robots {
  const origin = resolveSiteOrigin();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/watchlist"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
