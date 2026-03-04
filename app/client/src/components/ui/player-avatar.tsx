"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { playerImageUrl } from "@/lib/player-image";

interface PlayerAvatarProps {
  playerId: number;
  name: string;
  size?: "sm" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "h-8 w-8",
  lg: "h-24 w-24",
};

export function PlayerAvatar({
  playerId,
  name,
  size = "sm",
  className = "",
}: PlayerAvatarProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-surface-alt text-muted font-semibold ${SIZE_CLASSES[size]} ${className}`}
      >
        <span className={size === "lg" ? "text-2xl" : "text-xs"}>
          {initials}
        </span>
      </div>
    );
  }

  return (
    <img
      src={playerImageUrl(playerId, size)}
      alt={name}
      className={`shrink-0 rounded-full object-cover object-top ${SIZE_CLASSES[size]} ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
