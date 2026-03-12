"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

function trackPageView(pathAndQuery: string) {
  if (!measurementId || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("config", measurementId, {
    page_path: pathAndQuery,
  });
}

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const hasHandledInitialRoute = useRef(false);

  useEffect(() => {
    const pathAndQuery = query ? `${pathname}?${query}` : pathname;
    if (!hasHandledInitialRoute.current) {
      hasHandledInitialRoute.current = true;
      return;
    }
    trackPageView(pathAndQuery);
  }, [pathname, query]);

  if (!measurementId) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}
