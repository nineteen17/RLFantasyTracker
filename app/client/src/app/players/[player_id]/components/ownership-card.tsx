import type { PlayerCurrent } from "@nrl/types";
import { formatPercent } from "@/lib/utils";

interface OwnershipCardProps {
  current: PlayerCurrent;
}

interface TransferSnapshot {
  tradeIns: number | null;
  tradeOuts: number | null;
  netTrades: number | null;
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function collectNumericEntries(
  value: unknown,
  entries: Array<{ key: string; path: string; value: number }>,
  path = "",
  depth = 0,
): void {
  if (depth > 3 || value == null) return;

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      collectNumericEntries(value[i], entries, `${path}${i}`, depth + 1);
    }
    return;
  }

  if (typeof value !== "object") return;

  for (const [rawKey, rawVal] of Object.entries(value)) {
    const key = normalizeKey(rawKey);
    const nextPath = path ? `${path}.${key}` : key;
    const numeric = parseNumeric(rawVal);

    if (numeric != null) {
      entries.push({ key, path: nextPath, value: numeric });
      continue;
    }

    if (rawVal && typeof rawVal === "object") {
      collectNumericEntries(rawVal, entries, nextPath, depth + 1);
    }
  }
}

function findBestNumeric(
  entries: Array<{ key: string; path: string; value: number }>,
  aliases: readonly string[],
): number | null {
  let best:
    | { score: number; depth: number; value: number }
    | null = null;

  for (const entry of entries) {
    const depth = entry.path.split(".").length;

    for (const alias of aliases) {
      let score = 0;

      if (entry.key === alias) score = 4;
      else if (entry.key.endsWith(alias)) score = 3;
      else if (alias.length >= 4 && entry.key.includes(alias)) score = 2;
      else if (entry.path.endsWith(alias)) score = 1;

      if (score === 0) continue;

      if (
        !best ||
        score > best.score ||
        (score === best.score && depth < best.depth)
      ) {
        best = { score, depth, value: entry.value };
      }
    }
  }

  return best?.value ?? null;
}

function extractTransferSnapshot(rawTransfers: unknown): TransferSnapshot | null {
  if (!rawTransfers || typeof rawTransfers !== "object") return null;

  const entries: Array<{ key: string; path: string; value: number }> = [];
  collectNumericEntries(rawTransfers, entries);
  if (entries.length === 0) return null;

  const tradeIns = findBestNumeric(entries, [
    "tradein",
    "tradesin",
    "transferin",
    "transfersin",
    "incoming",
    "ins",
    "in",
  ]);
  const tradeOuts = findBestNumeric(entries, [
    "tradeout",
    "tradesout",
    "transferout",
    "transfersout",
    "outgoing",
    "outs",
    "out",
  ]);
  const explicitNet = findBestNumeric(entries, [
    "net",
    "nettrade",
    "nettrades",
    "delta",
    "change",
    "diff",
  ]);

  const netTrades =
    explicitNet ?? (tradeIns != null && tradeOuts != null ? tradeIns - tradeOuts : null);

  if (tradeIns == null && tradeOuts == null && netTrades == null) return null;

  return {
    tradeIns,
    tradeOuts,
    netTrades,
  };
}

function formatCount(value: number | null): string {
  if (value == null) return "-";
  return Math.round(value).toLocaleString();
}

function formatSignedCount(value: number | null): string {
  if (value == null) return "-";
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded.toLocaleString()}`;
  return rounded.toLocaleString();
}

function parsePercentValue(pct: number | string | null | undefined): number {
  if (pct == null) return 0;
  const n = typeof pct === "string" ? Number.parseFloat(pct) : pct;
  return Number.isFinite(n) ? n : 0;
}

function PercentBar({
  label,
  value,
  max = 100,
}: {
  label: string;
  value: number | string | null | undefined;
  max?: number;
}) {
  const pct = parsePercentValue(value);
  const width = Math.min(100, Math.max(0, (pct / max) * 100));

  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted md:text-base">{label}</span>
        <span className="text-sm font-semibold tabular-nums md:text-base">
          {formatPercent(value)}
        </span>
      </div>
      <div className="relative mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-alt">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent to-accent-light transition-all duration-500"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function TradeFlowRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const toneClass =
    tone === "positive"
      ? "text-green-400"
      : tone === "negative"
        ? "text-red-400"
        : "";

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-muted md:text-base">{label}</span>
      <span
        className={`text-sm font-semibold tabular-nums md:text-base ${toneClass}`}
      >
        {value}
      </span>
    </div>
  );
}

export function OwnershipCard({ current }: OwnershipCardProps) {
  const transfers = extractTransferSnapshot(current.transfers);
  const ownedPct = parsePercentValue(current.ownedBy);

  return (
    <div className="space-y-3">
      {/* Owned by - hero treatment */}
      <div className="relative overflow-hidden rounded-xl border border-accent-light/20 bg-gradient-to-br from-accent-light/[0.08] to-accent/[0.04] p-4 md:p-5">
        <p className="text-xs font-medium tracking-wide text-accent-light/70 uppercase md:text-sm">
          Ownership
        </p>
        <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight md:text-3xl">
          {formatPercent(current.ownedBy)}
        </p>
        <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent to-accent-light transition-all duration-500"
            style={{ width: `${Math.min(100, ownedPct)}%` }}
          />
        </div>
        {current.selections != null && (
          <p className="mt-2 text-xs text-muted md:text-sm">
            {Number(current.selections).toLocaleString()} selections
          </p>
        )}
      </div>

      {/* Captaincy */}
      <div className="rounded-xl border border-border/60 bg-surface p-4 md:p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold md:text-base">
          <span className="inline-block h-3 w-0.5 rounded-full bg-accent-light" />
          Captaincy
        </h3>
        <div className="mt-3 space-y-0.5">
          <PercentBar label="Captain" value={current.captainPct} max={30} />
          <PercentBar label="Vice Captain" value={current.vcPct} max={30} />
          <PercentBar label="Bench" value={current.benchPct} />
        </div>
      </div>

      {/* Draft + Trade Flow */}
      <div className="rounded-xl border border-border/60 bg-surface p-4 md:p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold md:text-base">
          <span className="inline-block h-3 w-0.5 rounded-full bg-accent-light" />
          Market
        </h3>
        <div className="mt-3 divide-y divide-border/40">
          <div className="flex items-center justify-between gap-3 py-2">
            <span className="text-sm text-muted md:text-base">
              Avg Draft Position
            </span>
            <span className="text-sm font-semibold tabular-nums md:text-base">
              {current.adp ?? "-"}
            </span>
          </div>
          {transfers && (
            <>
              {transfers.tradeIns != null && (
                <TradeFlowRow
                  label="Trades In"
                  value={formatCount(transfers.tradeIns)}
                  tone="positive"
                />
              )}
              {transfers.tradeOuts != null && (
                <TradeFlowRow
                  label="Trades Out"
                  value={formatCount(transfers.tradeOuts)}
                  tone="negative"
                />
              )}
              {transfers.netTrades != null && (
                <TradeFlowRow
                  label="Net"
                  value={formatSignedCount(transfers.netTrades)}
                  tone={
                    transfers.netTrades > 0
                      ? "positive"
                      : transfers.netTrades < 0
                        ? "negative"
                        : "neutral"
                  }
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
