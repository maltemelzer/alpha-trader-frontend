// Asset classes of the securities page: which panels, facts and actions a listing type gets.

export type AssetClass = 'stock' | 'bond' | 'repo' | 'coin' | 'index' | 'etf' | 'warrant' | 'building' | 'other';

export function assetClass(type: string | undefined): AssetClass {
  switch (type) {
    case 'STOCK':
      return 'stock';
    case 'BOND':
    case 'SYSTEM_BOND':
    case 'INTEREST_TENDER_BOND':
      return 'bond';
    case 'REPO':
    case 'SYSTEM_REPO':
      return 'repo';
    case 'COIN':
      return 'coin';
    case 'INDEX':
      return 'index';
    case 'ETF':
      return 'etf';
    case 'WARRANT':
      return 'warrant';
    case 'BUILDING':
      return 'building';
    default:
      return 'other';
  }
}

/** Indexes are calculated, not traded: no order book, no ticket. */
export const isTradable = (c: AssetClass) => c !== 'index';

/** The bond behind a repo: RExxxx → BOxxxx, SRxxxx → SBxxxx. */
export function bondOfRepo(asin: string): string | undefined {
  if (asin.startsWith('RE')) return 'BO' + asin.slice(2);
  if (asin.startsWith('SR')) return 'SB' + asin.slice(2);
  return undefined;
}
