import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return `$${(price / 1000).toFixed(0)}k`;
}

export function formatNumber(num: number | string | null | undefined): string {
  if (num === null || num === undefined) return "-";
  const n = typeof num === "string" ? Number.parseFloat(num) : num;
  return n.toFixed(1);
}

export function formatPercent(pct: number | string | null | undefined): string {
  if (pct === null || pct === undefined) return "-";
  const n = typeof pct === "string" ? Number.parseFloat(pct) : pct;
  return `${n.toFixed(1)}%`;
}

export function formatShortName(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}.${lastName}`;
}
