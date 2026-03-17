"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { teamLogoUrl } from "@/lib/team-image";

interface TeamLogoProps {
  squadId: number;
  teamName: string;
  className?: string;
  showFallback?: boolean;
}

export function TeamLogo({
  squadId,
  teamName,
  className = "h-10 w-10",
  showFallback = true,
}: TeamLogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed && !showFallback) {
    return null;
  }

  if (failed) {
    const initials = teamName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("");

    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-alt text-xs font-semibold text-muted ${className}`}
      >
        {initials || "NRL"}
      </div>
    );
  }

  return (
    <img
      src={teamLogoUrl(squadId)}
      alt={`${teamName} logo`}
      className={`shrink-0 object-contain ${className}`}
      onError={() => setFailed(true)}
      loading="lazy"
      decoding="async"
    />
  );
}
