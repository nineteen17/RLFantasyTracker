"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";

interface TrackedCtaLinkProps {
  href: string;
  eventName: string;
  className?: string;
  children: ReactNode;
}

export function TrackedCtaLink({
  href,
  eventName,
  className,
  children,
}: TrackedCtaLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => trackEvent(eventName, { destination: href })}
    >
      {children}
    </Link>
  );
}
