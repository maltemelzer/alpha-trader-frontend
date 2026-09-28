import type { MinerView } from '../../design-system/components';

/** Hours until the next miner level has paid for itself through the extra coins (at today's coin price). */
export function paybackHours(m: MinerView, coinPrice: number | undefined): number | undefined {
  if (!coinPrice || m.nextLevelCosts == null || m.nextLevelCoinsPerHour == null) return undefined;
  const extra = (m.nextLevelCoinsPerHour - m.coinsPerHour) * coinPrice;
  return extra > 0 ? m.nextLevelCosts / extra : undefined;
}

export interface BankAccount {
  id: string;
  name: string;
  cash: number;
  /** The player's private account – the only one the server lets send transfers. */
  private?: boolean;
}

/** Private account first, then companies run as CEO (by name). */
export function bankAccounts(
  privateAccounts: { id: string; cash: number }[],
  companies: { name?: string; bankAccount?: { id?: string; cash?: number } }[],
): BankAccount[] {
  return [
    ...privateAccounts.map((a) => ({ id: a.id, name: 'Privatkonto', cash: a.cash, private: true })),
    ...companies
      .filter((c) => c.bankAccount?.id)
      .map((c) => ({ id: c.bankAccount!.id!, name: c.name ?? 'Unternehmen', cash: c.bankAccount!.cash ?? 0 }))
      .sort((a, b) => a.name.localeCompare(b.name, 'de')),
  ];
}
