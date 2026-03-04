"use client";

import { useState } from "react";
import { TIMEZONES } from "@/lib/timezone";
import { useTimezone } from "@/hooks/use-timezone";

export function TimezonePicker() {
  const [tz, setTz] = useTimezone();
  const [open, setOpen] = useState(false);

  const current = TIMEZONES.find((t) => t.value === tz);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-muted hover:text-foreground transition-colors shrink-0"
      >
        <span>{current?.label ?? "TZ"}</span>
        <svg
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-[280px] rounded-xl border border-border bg-surface shadow-2xl shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold">Timezone</h3>
            </div>
            <div className="py-1">
              {TIMEZONES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    setTz(t.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                    tz === t.value
                      ? "bg-accent/15 text-accent-light"
                      : "text-muted hover:bg-surface-alt hover:text-foreground"
                  }`}
                >
                  <span className="font-medium">{t.label}</span>
                  <span className="text-xs opacity-60">{t.full}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
