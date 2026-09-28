// Increasing the central bank reserves of a bank: what moves where and what it earns (pure, tested).

/** Cash a company needs before it can apply for a banking license (as in the game, DS `BANK_LICENSE_MIN_CASH`). */
export const BANK_LICENSE_MIN_CASH = 5_000_000;

/** The credit line of a bank is 10 % of its reserves (`maxCentralBankLoans`). */
export const CREDIT_SHARE = 0.1;

/** Shares of the cash offered as quick picks. */
export const QUICK_SHARES = [0.1, 0.25, 0.5, 1] as const;

export interface ReservesEffect {
  amount: number;
  cashBefore: number;
  cashAfter: number;
  reservesBefore: number;
  reservesAfter: number;
  /** reserve rate + boost, % per day */
  ratePerDay?: number;
  incomeBefore?: number;
  incomeAfter?: number;
  creditBefore: number;
  creditAfter: number;
}

/**
 * Move `amount` from the bank's cash into its reserves. The central bank pays the reserve rate
 * (+ boost) every day on the reserves into the bank's cash; the credit line grows with them.
 */
export function reservesEffect(
  amount: number,
  bank: { cash?: number; reserves?: number },
  reserveRate: number | undefined,
  boost = 0,
): ReservesEffect {
  const a = Math.max(0, amount);
  const cash = bank.cash ?? 0;
  const before = bank.reserves ?? 0;
  const after = before + a;
  const rate = reserveRate != null ? reserveRate + boost : undefined;
  return {
    amount: a,
    cashBefore: cash,
    cashAfter: cash - a,
    reservesBefore: before,
    reservesAfter: after,
    ratePerDay: rate,
    incomeBefore: rate != null ? (before * rate) / 100 : undefined,
    incomeAfter: rate != null ? (after * rate) / 100 : undefined,
    creditBefore: before * CREDIT_SHARE,
    creditAfter: after * CREDIT_SHARE,
  };
}

/** Why an amount cannot be put into the reserves, or undefined when it can (empty input is no error). */
export function reservesAmountError(raw: string, parsed: number | null, cash: number | undefined): string | undefined {
  if (!raw.trim()) return undefined;
  if (parsed == null) return 'Betrag wie „2,5 Mio.“ oder „1.000.000“';
  if (parsed <= 0) return 'Bitte einen Betrag über 0 eingeben.';
  if (cash != null && parsed > cash) return `Nicht genug Bargeld – höchstens ${cash.toLocaleString('de-DE', { maximumFractionDigits: 2 })} €.`;
  return undefined;
}

/** A share of the cash, rounded down to the cent (so „Alles“ never asks for more than there is). */
export function shareOfCash(cash: number | undefined, share: number): number {
  if (!cash || cash <= 0) return 0;
  return Math.floor(cash * share * 100) / 100;
}

/** Days until the added reserves have earned their own amount once at a constant rate (simple interest). */
export function daysToEarnBack(ratePerDay: number | undefined): number | undefined {
  return ratePerDay && ratePerDay > 0 ? 100 / ratePerDay : undefined;
}

/** How far a company is from the banking license: share of the minimum cash, capped at 100. */
export function licenseProgress(cash: number | undefined): number {
  if (!cash || cash <= 0) return 0;
  return Math.min(100, (cash / BANK_LICENSE_MIN_CASH) * 100);
}
