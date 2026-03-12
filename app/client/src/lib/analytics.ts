declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
) {
  if (typeof window === "undefined") {
    return;
  }

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
    return;
  }

  // Fallback queue so early interactions are not lost before gtag is ready.
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(["event", eventName, params ?? {}]);
}
