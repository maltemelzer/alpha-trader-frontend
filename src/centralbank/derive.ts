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

// ---------- Money supply ----------

export interface SupplyPoint {
  date: number;
  supply: number;
  target: number;
  /** Supply vs target in % (−2 = 2 % below) */
  gapPct: number;
  soldBondVolume: number;
  /** appliedInterestRate in % (the API sends a fraction) */
  ratePct: number;
}

/** Money supply snapshots oldest first, with the gap to the target and the rate in %. */
export function supplySeries(
  snapshots: { date: number; playerMoneySupply: number; targetSupply: number; soldBondVolume?: number; appliedInterestRate?: number }[] | undefined,
): SupplyPoint[] {
  return (snapshots ?? [])
    .filter((s) => s.date != null && Number.isFinite(s.playerMoneySupply))
    .map((s) => ({
      date: s.date,
      supply: s.playerMoneySupply,
      target: s.targetSupply,
      gapPct: s.targetSupply ? (s.playerMoneySupply / s.targetSupply - 1) * 100 : 0,
      soldBondVolume: s.soldBondVolume ?? 0,
      ratePct: (s.appliedInterestRate ?? 0) * 100,
    }))
    .sort((a, b) => a.date - b.date);
}

/**
 * How the target follows the previous supply: target = previous supply × (1 + x %). Returns x when
 * all steps agree within 0,001 Pp. (observed: 0,1), otherwise undefined.
 */
export function targetGrowthPct(points: SupplyPoint[]): number | undefined {
  const steps = points.slice(1).map((p, i) => (p.target / points[i].supply - 1) * 100);
  if (!steps.length || steps.some((s) => !Number.isFinite(s))) return undefined;
  const lo = Math.min(...steps);
  const hi = Math.max(...steps);
  return hi - lo < 0.001 ? Math.round(((lo + hi) / 2) * 1000) / 1000 : undefined;
}

/** True when a rate was applied only at snapshots below target (what the data showed so far). */
export function rateOnlyBelowTarget(points: SupplyPoint[]): boolean {
  return points.some((p) => p.ratePct > 0) && points.every((p) => (p.ratePct > 0 ? p.gapPct < 0 : true) && (p.gapPct > 0 ? p.ratePct === 0 : true));
}

export const POT_LABEL: Record<string, string> = {
  PLAYERS: 'Spieler',
  COMPANIES: 'Unternehmen',
  ALPHA_BANK: 'Alpha Bank',
  ALPHA_BANKER: 'Alpha Banker',
  CENTRAL_BANK_RESERVES: 'Zentralbankeinlagen',
  CENTRAL_BANK_TRUST: 'Zentralbank-Treuhand',
  SPECIAL_PURPOSE: 'Sonderkonten',
  ORPHANED: 'Verwaist',
  UNASSIGNED: 'Nicht zugeordnet',
};

/** Shorter names for narrow charts. */
export const POT_SHORT: Record<string, string> = {
  CENTRAL_BANK_RESERVES: 'ZB-Einlagen',
  CENTRAL_BANK_TRUST: 'ZB-Treuhand',
  UNASSIGNED: 'Ohne Zuordnung',
};

export interface PotRow {
  pot: string;
  label: string;
  cash: number;
  accountCount: number;
  /** Share of the sum of all pots in % */
  percent: number;
}

/** Pots with money, largest first, as share of all money; empty pots are left out. */
export function potRows(pots: { pot: string; cash: number; accountCount: number }[] | undefined): PotRow[] {
  const held = (pots ?? []).filter((p) => p.cash > 0);
  const total = held.reduce((s, p) => s + p.cash, 0);
  if (!total) return [];
  return held
    .map((p) => ({ ...p, label: POT_LABEL[p.pot] ?? p.pot, percent: (p.cash / total) * 100 }))
    .sort((a, b) => b.cash - a.cash);
}

const NBSP = String.fromCharCode(0xa0);

/** German percent with sign and real minus: „+5,9 %“, „−3,30 %“ (no-break space before %). */
export function signedPct(n: number, digits = 1): string {
  const s = Math.abs(n).toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${n > 0 ? '+' : n < 0 ? '−' : '±'}${s}${NBSP}%`;
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
