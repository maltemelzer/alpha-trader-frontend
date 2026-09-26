// Miner upgrade planning: each level costs 50 % more than the one before and mines 25 % more coins,
// so every further level takes 1,5 / 1,25 = 1,2× as long to pay for itself.
import type { MinerView } from '../../vendor/bankiersgruen';

export const COST_GROWTH = 1.5;
export const RATE_GROWTH = 1.25;

export interface MinerStep {
  /** Levels above today's (0 = as it is). */
  step: number;
  /** Price of this one level (0 for step 0). */
  cost: number;
  /** All levels up to this one. */
  totalCost: number;
  /** AlphaCoins per hour after this level. */
  rate: number;
  /** Coins per hour more than today. */
  extraRate: number;
  /** Hours until this level alone has paid for itself (coin price); null for step 0 or without price. */
  stepPaybackHours: number | null;
  /** Hours until all levels up to here have paid for themselves together. */
  paybackHours: number | null;
}

/**
 * Today's miner plus `count` further levels. The first level comes from the server (`nextLevelCosts`,
 * `nextLevelCoinsPerHour`), the ones after it are extrapolated with ×1,5 cost and ×1,25 coins.
 */
export function minerSteps(m: MinerView, coinPrice: number | undefined, count: number): MinerStep[] {
  const steps: MinerStep[] = [
    { step: 0, cost: 0, totalCost: 0, rate: m.coinsPerHour, extraRate: 0, stepPaybackHours: null, paybackHours: null },
  ];
  if (m.nextLevelCosts == null || m.nextLevelCoinsPerHour == null) return steps;
  const price = coinPrice && coinPrice > 0 ? coinPrice : null;
  let cost = m.nextLevelCosts;
  let rate = m.nextLevelCoinsPerHour;
  for (let k = 1; k <= count; k++) {
    const prev = steps[k - 1];
    const totalCost = prev.totalCost + cost;
    const extraRate = rate - m.coinsPerHour;
    const gain = rate - prev.rate;
    steps.push({
      step: k,
      cost,
      totalCost,
      rate,
      extraRate,
      stepPaybackHours: price && gain > 0 ? cost / (gain * price) : null,
      paybackHours: price && extraRate > 0 ? totalCost / (extraRate * price) : null,
    });
    cost *= COST_GROWTH;
    rate *= RATE_GROWTH;
  }
  return steps;
}

/** Profit after `hours` from building up to this step: extra coins at the coin price minus the cost. */
export function netAfter(s: MinerStep, hours: number, coinPrice: number): number {
  return s.extraRate * coinPrice * hours - s.totalCost;
}

/** The step with the highest profit after `hours` (0 = don't build); the lower one on a tie. */
export function bestStep(steps: MinerStep[], hours: number, coinPrice: number): number {
  let best = 0;
  let bestNet = 0;
  for (const s of steps) {
    const n = netAfter(s, hours, coinPrice);
    if (n > bestNet + 1e-9) {
      best = s.step;
      bestNet = n;
    }
  }
  return best;
}

/** The highest step whose total cost the cash covers (0 = not even the next one). */
export function affordableStep(steps: MinerStep[], cash: number | undefined): number | null {
  if (cash == null) return null;
  let last = 0;
  for (const s of steps) if (s.totalCost <= cash) last = s.step;
  return last;
}

/** How far the chart goes: a few levels past the best one and the cash limit, at least 10. */
export function planLength(best: number, affordable: number | null): number {
  return Math.min(30, Math.max(10, best + 4, (affordable ?? 0) + 2));
}

/** Hours the storage holds at this rate (the miner stops when it is full). */
export function storageHours(m: MinerView): number | null {
  return m.coinsPerHour > 0 && m.maximumCapacity > 0 ? m.maximumCapacity / m.coinsPerHour : null;
}
