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

function MetricTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-surface-alt/35 p-3">
      <p className="text-xs text-muted md:text-sm">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums md:text-xl">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-sm text-muted md:text-base">{label}</span>
      <span className="text-sm font-semibold tabular-nums md:text-base">{value}</span>
    </div>
  );
}

export function OwnershipCard({ current }: OwnershipCardProps) {
  const transfers = extractTransferSnapshot(current.transfers);

  return (
    <div className="rounded-xl border border-border bg-surface p-4 md:p-6">
      <h2 className="text-xl font-bold">Ownership</h2>
      <p className="mt-1 text-sm text-muted md:text-base">
        Selection and captaincy market snapshot.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <MetricTile label="Owned By" value={formatPercent(current.ownedBy)} />
        <MetricTile label="Selections" value={current.selections ?? "-"} />
      </div>

      <div className="mt-4 rounded-lg border border-border bg-surface-alt/25 p-3.5 md:p-4">
        <h3 className="text-sm font-semibold text-foreground md:text-base">
          Captaincy Split
        </h3>
        <div className="mt-2 divide-y divide-border/50">
          <DetailRow label="Captain %" value={formatPercent(current.captainPct)} />
          <DetailRow
            label="Vice Captain %"
            value={formatPercent(current.vcPct)}
          />
          <DetailRow label="Bench %" value={formatPercent(current.benchPct)} />
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-border bg-surface-alt/25 p-3.5 md:p-4">
        <h3 className="text-sm font-semibold text-foreground md:text-base">
          Draft / Market
        </h3>
        <div className="mt-2 divide-y divide-border/50">
          <DetailRow label="Avg Draft Position" value={current.adp ?? "-"} />
        </div>
      </div>

      {transfers && (
        <div className="mt-3 rounded-lg border border-border bg-surface-alt/25 p-3.5 md:p-4">
          <h3 className="text-sm font-semibold text-foreground md:text-base">
            Trade Flow
          </h3>
          <div className="mt-2 divide-y divide-border/50">
            {transfers.tradeIns != null && (
              <DetailRow label="Trades In" value={formatCount(transfers.tradeIns)} />
            )}
            {transfers.tradeOuts != null && (
              <DetailRow
                label="Trades Out"
                value={formatCount(transfers.tradeOuts)}
              />
            )}
            {transfers.netTrades != null && (
              <DetailRow
                label="Net Trades"
                value={formatSignedCount(transfers.netTrades)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
