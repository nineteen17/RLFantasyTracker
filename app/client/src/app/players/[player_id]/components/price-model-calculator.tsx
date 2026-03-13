"use client";

import { useMemo, useState } from "react";
import type { PlayerCurrent } from "@nrl/types";
import {
  estimateAverageFromPrice,
  estimatePriceFromAverage,
} from "@/lib/price-model";
import { formatPrice } from "@/lib/utils";

interface PriceModelCalculatorProps {
  current: PlayerCurrent;
  cost: number;
}

function toFiniteNumber(
  value: string | number | null | undefined,
): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function PriceModelCalculator({
  current,
  cost,
}: PriceModelCalculatorProps) {
  const fairBandPercent = 3;
  const defaultAvg = useMemo(() => {
    return (
      toFiniteNumber(current.projAvg) ?? toFiniteNumber(current.avgPoints) ?? 40
    );
  }, [current.avgPoints, current.projAvg]);

  const [avgInput, setAvgInput] = useState<string>(
    String(Math.round(defaultAvg)),
  );
  const currentAvg = toFiniteNumber(current.avgPoints);
  const impliedAvgAtCurrentPrice = estimateAverageFromPrice(cost);
  const referenceCurrentAvg = currentAvg ?? estimateAverageFromPrice(cost);
  const fairPriceAtCurrentAvg = estimatePriceFromAverage(referenceCurrentAvg);
  const avgPoints = Number(avgInput) || 0;
  const fairPriceAtExpectedAvg = estimatePriceFromAverage(avgPoints);
  const expectedGap = fairPriceAtExpectedAvg - cost;
  const expectedGapPercent = cost > 0 ? (expectedGap / cost) * 100 : 0;
  const verdict =
    expectedGapPercent > fairBandPercent
      ? "Underpriced"
      : expectedGapPercent < -fairBandPercent
        ? "Overpriced"
        : "Fairly Priced";
  const verdictClass =
    verdict === "Underpriced"
      ? "text-green-400"
      : verdict === "Overpriced"
        ? "text-red-400"
        : "text-accent-light";

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h2 className="text-xl font-bold">Price Calculator</h2>
      <div className="mt-4 rounded-md border border-border/70 bg-surface-alt/40 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="model-avg" className="text-xs text-muted md:text-sm">
              Expected Avg
            </label>
            <input
              id="model-avg"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={avgInput}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                setAvgInput(v);
              }}
              className="mt-1 h-9 w-20 rounded-md border border-border bg-surface text-center text-base font-bold tabular-nums focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          {currentAvg != null && (
            <button
              type="button"
              onClick={() => setAvgInput(String(Math.round(currentAvg)))}
              className="h-9 rounded-md border border-border px-3 text-xs text-muted hover:text-foreground"
            >
              Use Current Avg
            </button>
          )}
          <div className={`ml-auto text-lg font-bold ${verdictClass}`}>{verdict}</div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border/60 bg-surface p-3">
            <div className="text-[11px] text-muted">Current Price</div>
            <div className="text-xl font-bold tabular-nums">{formatPrice(cost)}</div>
            <div className="text-[11px] text-muted">
              Priced At: {impliedAvgAtCurrentPrice.toFixed(1)} avg
            </div>
          </div>
          <div className="rounded-md border border-border/60 bg-surface p-3">
            <div className="text-[11px] text-muted">Fair Price</div>
            <div className="text-xl font-bold tabular-nums">
              {formatPrice(fairPriceAtExpectedAvg)}
            </div>
          </div>
          <div className="rounded-md border border-border/60 bg-surface p-3">
            <div className="text-[11px] text-muted">Gap</div>
            <div className={`text-xl font-bold tabular-nums ${verdictClass}`}>
              {expectedGap >= 0 ? "+" : ""}
              {formatPrice(expectedGap)}
            </div>
            <div className="text-[11px] text-muted">
              {expectedGapPercent >= 0 ? "+" : ""}
              {expectedGapPercent.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-muted">
        Current avg: {referenceCurrentAvg.toFixed(1)} | Fair price at current avg:{" "}
        {formatPrice(fairPriceAtCurrentAvg)}
        {currentAvg == null && <span> (avg estimated from price)</span>}
      </div>
    </div>
  );
}
