// Pure helpers for the central bank page: tender rate, bank shares, rate history.

/** A bid on the interest tender bond in % of face value → the rate it stands for (98 % ≙ 2 %, 102 % ≙ −2 %). */
export function tenderRate(bidPct: number | null | undefined): number | undefined {
  if (bidPct == null || !Number.isFinite(bidPct) || bidPct <= 0) return undefined;
  return 100 - bidPct;
}

export interface BankShare {
  name: string;
  asin?: string;
  reserves: number;
  /** Share of all listed reserves in % */
  percent: number;
  rest?: boolean;
}

/** Largest reserve holders plus one „Übrige“ row; entries without reserves are left out. */
export function bankShares(entries: { name: string; asin?: string; reserves: number }[], top = 8): BankShare[] {
  const held = entries.filter((e) => e.reserves > 0).sort((a, b) => b.reserves - a.reserves);
  const total = held.reduce((s, e) => s + e.reserves, 0);
  if (!total) return [];
  const rows: BankShare[] = held.slice(0, top).map((e) => ({ ...e, percent: (e.reserves / total) * 100 }));
  const rest = held.slice(top);
  if (rest.length) {
    const sum = rest.reduce((s, e) => s + e.reserves, 0);
    rows.push({ name: `Übrige (${rest.length.toLocaleString('de-DE')})`, reserves: sum, percent: (sum / total) * 100, rest: true });
  }
  return rows;
}

export interface RatePoint {
  date: number;
  main?: number;
  reserve?: number;
  systemBond?: number;
}

/** Hourly snapshots, oldest first, within the last `ms` (all when `ms` is undefined). */
export function rateWindow<T extends { date?: number }>(points: T[] | undefined, ms: number | undefined, now = Date.now()): T[] {
  return (points ?? [])
    .filter((p) => p.date != null && (ms == null || p.date >= now - ms))
    .sort((a, b) => a.date! - b.date!);
}

/** Interest a bank earns per day on its reserves at the reserve rate (without its coin boost). */
export function reserveIncome(reserves: number | undefined, reserveRatePct: number | undefined): number | undefined {
  if (reserves == null || reserveRatePct == null) return undefined;
  return (reserves * reserveRatePct) / 100;
}

/** Volume falling due per calendar day (local midnight), still running bonds only, oldest day first. */
export function dueByDay(bonds: { maturityDate?: number; volume?: number }[] | undefined, now = Date.now()) {
  const days = new Map<number, { day: number; volume: number; count: number }>();
  for (const b of bonds ?? []) {
    if (!b.maturityDate || b.maturityDate <= now) continue;
    const d = new Date(b.maturityDate);
    d.setHours(0, 0, 0, 0);
    const key = d.getTime();
    const e = days.get(key) ?? { day: key, volume: 0, count: 0 };
    e.volume += b.volume ?? 0;
    e.count += 1;
    days.set(key, e);
  }
  return [...days.values()].sort((a, b) => a.day - b.day);
}
