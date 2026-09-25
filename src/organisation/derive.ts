import type { PortfolioView } from '../api/types';
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
