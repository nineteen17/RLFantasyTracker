export const TIMEZONES = [
  { value: "Pacific/Auckland", label: "NZDT", full: "New Zealand" },
  { value: "Australia/Sydney", label: "AEDT", full: "Sydney / Melbourne" },
  { value: "Australia/Brisbane", label: "AEST", full: "Queensland" },
  { value: "Australia/Adelaide", label: "ACDT", full: "South Australia" },
  { value: "Australia/Perth", label: "AWST", full: "Western Australia" },
] as const;

export type TimezoneValue = (typeof TIMEZONES)[number]["value"];

export const TIMEZONE_STORAGE_KEY = "nrl-timezone";
export const TIMEZONE_CHANGE_EVENT = "nrl-timezone-change";
const DEFAULT_TZ: TimezoneValue = "Pacific/Auckland";

export function getTimezone(): TimezoneValue {
  if (typeof window === "undefined") return DEFAULT_TZ;
  return (localStorage.getItem(TIMEZONE_STORAGE_KEY) as TimezoneValue) ?? DEFAULT_TZ;
}

export function setTimezone(tz: TimezoneValue): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TIMEZONE_STORAGE_KEY, tz);
  window.dispatchEvent(
    new CustomEvent<TimezoneValue>(TIMEZONE_CHANGE_EVENT, { detail: tz }),
  );
}

export function formatMatchDate(dateStr: string, tz?: TimezoneValue): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("en-NZ", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz ?? getTimezone(),
  });
}
