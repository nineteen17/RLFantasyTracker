"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

const ENGAGED_THRESHOLD_MS = 90_000;

export function EngagedSessionTracker() {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;

    let hasInteracted = false;
    let timerExpired = false;

    function maybeFire() {
      if (firedRef.current || !hasInteracted || !timerExpired) return;
      firedRef.current = true;
      trackEvent("engaged_session");
    }

    function onInteraction() {
      if (hasInteracted) return;
      hasInteracted = true;
      maybeFire();
    }

    const timer = setTimeout(() => {
      timerExpired = true;
      maybeFire();
    }, ENGAGED_THRESHOLD_MS);

    window.addEventListener("click", onInteraction, { passive: true });
    window.addEventListener("scroll", onInteraction, { passive: true });
    window.addEventListener("keydown", onInteraction, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", onInteraction);
      window.removeEventListener("scroll", onInteraction);
      window.removeEventListener("keydown", onInteraction);
    };
  }, []);

  return null;
}
