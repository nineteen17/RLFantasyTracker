import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import MobileMenu from "@/components/ui/mobile-menu";
import DesktopNav from "@/components/ui/desktop-nav";
import GoogleAnalytics from "@/components/analytics/google-analytics";
import { EngagedSessionTracker } from "@/components/analytics/engaged-session-tracker";

function resolveSiteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "https://footybreakevens.com";
  try {
    return new URL(raw);
  } catch {
    return new URL("https://footybreakevens.com");
  }
}

export const metadata: Metadata = {
  metadataBase: resolveSiteUrl(),
  title: {
    default: "Footy Break Evens",
    template: "%s | Footy Break Evens",
  },
  description: "Player stats, value metrics, break evens, and team analysis.",
  openGraph: {
    type: "website",
    title: "Footy Break Evens",
    description: "Player stats, value metrics, break evens, and team analysis.",
    siteName: "Footy Break Evens",
  },
  twitter: {
    card: "summary_large_image",
    title: "Footy Break Evens",
    description: "Player stats, value metrics, break evens, and team analysis.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const themeInitScript = `
(() => {
  try {
    const storedTheme = localStorage.getItem("theme");
    const theme =
      storedTheme === "light" || storedTheme === "dark"
        ? storedTheme
        : window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark";
    document.documentElement.dataset.theme = theme;
  } catch {
    document.documentElement.dataset.theme = "dark";
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased bg-bg">
        <QueryProvider>
          <Suspense>
            <GoogleAnalytics />
            <EngagedSessionTracker />
            <MobileMenu />
            <DesktopNav />
          </Suspense>

          <main className="mx-auto max-w-[1600px] px-4 pb-20 pt-24 sm:px-6 md:pt-28 lg:px-8">
            {children}
          </main>
        </QueryProvider>
      </body>
    </html>
  );
}
