"use client";

import { useRouter } from "next/navigation";

interface HistoryCloseButtonProps {
  fallbackHref?: string;
  ariaLabel?: string;
}

export function HistoryCloseButton({
  fallbackHref = "/",
  ariaLabel = "Close",
}: HistoryCloseButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        router.push(fallbackHref);
      }}
      aria-label={ariaLabel}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-base font-semibold text-muted transition-colors hover:bg-surface-alt hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-light/40"
    >
      <span aria-hidden="true">×</span>
    </button>
  );
}
