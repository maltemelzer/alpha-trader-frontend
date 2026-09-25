import type { Suggestion } from '../../vendor/bankiersgruen';

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
