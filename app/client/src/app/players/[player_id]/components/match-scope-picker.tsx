"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";

interface MatchScopePickerProps {
  includePreseason: boolean;
  onChange: (includePreseason: boolean) => void;
}

export function MatchScopePicker({
  includePreseason,
  onChange,
}: MatchScopePickerProps) {
  const [open, setOpen] = useState(false);

  const label = includePreseason ? "Official + Preseason" : "Official";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 flex items-center gap-1.5 rounded border border-border bg-surface px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-foreground md:text-sm"
      >
        <span>{label}</span>
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-[300px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface shadow-2xl shadow-black/40"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold">Match Scope</h3>
            </div>
            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  onChange(false);
                  setOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left transition-colors ${
                  !includePreseason
                    ? "bg-accent/15 text-accent-light"
                    : "text-muted hover:bg-surface-alt hover:text-foreground"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-5">Official</p>
                    <p className="mt-0.5 text-xs opacity-70">NRL + Finals</p>
                  </div>
                  {!includePreseason && (
                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(true);
                  setOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left transition-colors ${
                  includePreseason
                    ? "bg-accent/15 text-accent-light"
                    : "text-muted hover:bg-surface-alt hover:text-foreground"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-5">
                      Official + Preseason
                    </p>
                    <p className="mt-0.5 text-xs opacity-70">
                      Trials + WCC + All Stars
                    </p>
                  </div>
                  {includePreseason && (
                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
