import type { HistorizedListingDataView, PortfolioView } from '../api/types';
import { afterRebase } from '../security/derive';
import type { Suggestion } from '../../vendor/bankiersgruen';

/**
 * Book value: cash plus the volume of all positions – as PortfolioSummary shows it.
 * `totalValue` of /api/v2/my/portfolio/summary leaves coins out (it equals the cash then).
 */
export function bookValue(p: Pick<PortfolioView, 'cash' | 'positions'>): number {
  return p.cash + p.positions.reduce((sum, x) => sum + (x.volume ?? 0), 0);
}

/** Where a suggestion's button leads. It never executes anything by itself. */
export function suggestionHref(s: Suggestion): string {
  const asin: string | undefined =
    s.actionData?.listing?.securityIdentifier ?? s.actionData?.securityIdentifier ?? s.actionData?.asin;
  switch (s.type) {
    case 'VOTING_POSSIBLE':
      return '/abstimmungen';
    case 'USER_ACHIEVEMENT':
    case 'CORPORATE_ACHIEVEMENT':
    case 'ALLIANCE_ACHIEVEMENT':
      return '/erfolge';
    case 'TRANSFER_PRIVATE_COINS':
    case 'UPGRADE_PRIVATE_MINER':
      return '/miner';
    case 'FOUND_COMPANY':
      return '/unternehmen/gruenden';
    default:
      return asin ? `/wertpapier/${asin}` : '/markt';
  }
}

/**
 * Sparkline of an own index: the last `days` daily closes after the latest chaining (indexes jump
 * from the base value to the real value), with the change over that stretch in %.
 */
export function indexTrend(history: HistorizedListingDataView[] | undefined, days = 14): { spark: number[]; change?: number } {
  const closes = afterRebase(
    (history ?? []).map((d) => d.closePrice ?? 0).filter((v) => v > 0),
    (v) => v,
  ).slice(-days);
  const first = closes[0];
  const last = closes[closes.length - 1];
  return { spark: closes, change: closes.length > 1 && first ? (last / first - 1) * 100 : undefined };
}

/** ETFs (of the player) that track the index – they lose their base index when it is deleted. */
export function etfsTracking<T extends { baseIndexAsin?: string }>(etfs: T[] | undefined, indexAsin: string): T[] {
  return (etfs ?? []).filter((e) => e.baseIndexAsin === indexAsin);
}
