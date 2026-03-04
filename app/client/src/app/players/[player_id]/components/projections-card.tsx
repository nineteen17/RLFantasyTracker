"use client";

import { useState, useMemo } from "react";
import type { PlayerCurrent } from "@nrl/types";
import { formatNumber, formatPrice } from "@/lib/utils";

interface ProjectionsCardProps {
  current: PlayerCurrent;
  cost: number;
}

function computePricePerPoint(
  projScores: Record<string, number>,
  projPrices: Record<string, number>,
  breakEvens: Record<string, number>,
  currentCost: number,
  rounds: number[],
): number[] {
  const rates: number[] = [];
  for (let i = 0; i < rounds.length; i++) {
    const rd = rounds[i];
    const score = projScores[rd];
    const be = breakEvens[rd];
    const diff = score - be;
    const prevPrice = i === 0 ? currentCost : projPrices[rd];
    const nextPrice = projPrices[rd + 1] ?? projPrices[rounds[i] + 1];

    if (diff !== 0 && prevPrice != null && nextPrice != null) {
      const priceChange = nextPrice - prevPrice;
      rates.push(priceChange / diff);
    } else {
      // Fallback: use adjacent round's rate or a reasonable default
      rates.push(rates.length > 0 ? rates[rates.length - 1] : 1000);
    }
  }
  return rates;
}

export function ProjectionsCard({ current, cost }: ProjectionsCardProps) {
  const projScores = current.projScores as Record<string, number> | null;
  const projPrices = current.projPrices as Record<string, number> | null;
  const breakEvens = current.breakEvens as Record<string, number> | null;

  const rounds = useMemo(() => {
    if (!breakEvens) return [];
    return Object.keys(breakEvens)
      .map(Number)
      .sort((a, b) => a - b)
      .slice(0, 3);
  }, [breakEvens]);

  const defaultScore = useMemo(() => {
    if (!projScores || rounds.length === 0) return 40;
    return projScores[rounds[0]] ?? 40;
  }, [projScores, rounds]);

  const [inputScore, setInputScore] = useState<string>(String(defaultScore));
  const userScore = Number(inputScore) || 0;

  const pricePerPoint = useMemo(() => {
    if (!projScores || !projPrices || !breakEvens || rounds.length === 0) return [];
    return computePricePerPoint(projScores, projPrices, breakEvens, cost, rounds);
  }, [projScores, projPrices, breakEvens, cost, rounds]);

  const predictions = useMemo(() => {
    if (!breakEvens || rounds.length === 0 || pricePerPoint.length === 0) return [];

    let prevPrice = cost;
    return rounds.map((rd, i) => {
      const be = breakEvens[rd];
      const change = Math.round((userScore - be) * pricePerPoint[i]);
      const newPrice = Math.max(230000, prevPrice + change);
      const result = { round: rd + 1, be, price: newPrice, change: newPrice - prevPrice };
      prevPrice = newPrice;
      return result;
    });
  }, [breakEvens, rounds, pricePerPoint, userScore, cost]);

  const hasData = rounds.length > 0 && predictions.length > 0;

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h2 className="text-xl font-bold">Projections & Price Predictor</h2>

      <div className="mt-4 space-y-5">
        {hasData ? (
          <>
            <div className="flex items-center gap-6">
              <div>
                <div className="text-xs text-muted md:text-sm">Avg Points</div>
                <div className="text-2xl font-bold">
                  {formatNumber(current.avgPoints)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted md:text-sm">Projected Avg</div>
                <div className="text-2xl font-bold">
                  {formatNumber(current.projAvg)}
                </div>
              </div>
              <div>
                <label
                  htmlFor="predict-score"
                  className="text-xs text-muted md:text-sm"
                >
                  Your predicted score
                </label>
                <input
                  id="predict-score"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={inputScore}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setInputScore(v);
                  }}
                  className="mt-1 h-8 w-16 rounded-md border border-border bg-surface-alt text-center text-sm font-bold tabular-nums focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent md:text-base"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm md:text-base">
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th className="py-2 text-left font-medium">Round</th>
                    <th className="py-2 text-right font-medium">BE</th>
                    <th className="py-2 text-right font-medium">Price</th>
                    <th className="py-2 text-right font-medium">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p) => (
                    <tr key={p.round} className="border-b border-border/50">
                      <td className="py-2.5 font-medium">Round {p.round}</td>
                      <td className="py-2.5 text-right tabular-nums">{p.be}</td>
                      <td className="py-2.5 text-right tabular-nums font-medium">
                        {formatPrice(p.price)}
                      </td>
                      <td
                        className={`py-2.5 text-right tabular-nums font-medium ${
                          p.change > 0
                            ? "text-green-400"
                            : p.change < 0
                              ? "text-red-400"
                              : "text-muted"
                        }`}
                      >
                        {p.change >= 0 ? "+" : ""}
                        {formatPrice(p.change)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-xs text-muted md:text-sm">Avg Points</div>
                <div className="text-2xl font-bold">
                  {formatNumber(current.avgPoints)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted md:text-sm">Projected Avg</div>
                <div className="text-2xl font-bold">
                  {formatNumber(current.projAvg)}
                </div>
              </div>
            </div>
            <p className="text-sm text-muted md:text-base">
              No price prediction data available yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
