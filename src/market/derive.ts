import type { MarketRow } from '../api/queries';
import type { SecurityOrderLogEntryView } from '../api/types';
import type { BondView, MarketFilterValue, MarketResult, TickerItem } from '../../vendor/bankiersgruen';

export interface Mover {
  asin: string;
  name: string;
  change: number;
}

/**
 * Top winners and losers of one type. Only rows with a real move and a last price count;
 * the API sorts by magnitude, so both lists come from their own call.
 */
export function movers(winners: MarketRow[], losers: MarketRow[], type = 'STOCK', n = 5): Mover[] {
  const pick = (rows: MarketRow[], sign: 1 | -1) =>
    rows
      .filter((r) => r.listing.type === type && r.lastPrice && Math.sign(r.priceChangeInPercent ?? 0) === sign)
      .slice(0, n)
      .map((r) => ({ asin: r.listing.securityIdentifier, name: r.listing.name, change: r.priceChangeInPercent! }));
  return [...pick(winners, 1), ...pick(losers, -1).reverse()];
}

/** Latest trades, newest first, as LiveTicker items; names come from whatever lists are loaded. */
export function tickerItems(
  trades: SecurityOrderLogEntryView[],
  names: Record<string, { name: string; type: string }>,
  max = 30,
): TickerItem[] {
  return [...trades]
    .sort((a, b) => (b.date ?? 0) - (a.date ?? 0))
    .slice(0, max)
    .map((t) => {
      const asin = t.securityIdentifier ?? '';
      const known = names[asin];
      return {
        id: t.id ?? `${asin}-${t.date}`,
        listing: { securityIdentifier: asin, name: known?.name ?? asin, type: known?.type as never },
        price: t.price ?? 0,
        numberOfShares: t.numberOfShares,
        date: t.date ?? 0,
      };
    });
}

/** Trades per security in the loaded window – the most active ones first. */
export function tradeCounts(trades: SecurityOrderLogEntryView[]) {
  const m = new Map<string, { count: number; volume: number }>();
  for (const t of trades) {
    const k = t.securityIdentifier ?? '';
    const e = m.get(k) ?? { count: 0, volume: 0 };
    e.count += 1;
    e.volume += t.volume ?? 0;
    m.set(k, e);
  }
  return [...m.entries()].map(([asin, e]) => ({ asin, ...e })).sort((a, b) => b.volume - a.volume);
}

/** Market filter applied to loaded rows: type, ask price range, only with ask/bid. */
export function applyFilter(rows: MarketRow[], v: MarketFilterValue): MarketRow[] {
  const num = (x: unknown) => (x == null || x === '' ? undefined : Number(String(x).replace(/\./g, '').replace(',', '.')));
  const min = num(v.minPrice);
  const max = num(v.maxPrice);
  return rows.filter(
    (r) =>
      typeMatches(r.listing.type, v.type) &&
      matchesSearch(r, v.search) &&
      (!v.withAsk || (r.askSize ?? 0) > 0) &&
      (!v.withBid || (r.bidSize ?? 0) > 0) &&
      (min == null || (r.askPrice != null && r.askPrice >= min)) &&
      (max == null || (r.askPrice != null && r.askPrice <= max)),
  );
}

export function toResult(r: MarketRow): MarketResult {
  return {
    listing: r.listing as MarketResult['listing'],
    price: {
      bidPrice: r.bidPrice ?? undefined,
      bidSize: r.bidSize ?? undefined,
      askPrice: r.askPrice ?? undefined,
      askSize: r.askSize ?? undefined,
    },
  };
}

/** The filter „Anleihen“ also covers system bonds and interest tenders, „Repos“ system repos. */
export function typeMatches(type: string, filter: string | undefined): boolean {
  if (!filter) return true;
  if (filter === 'BOND') return type === 'BOND' || type === 'SYSTEM_BOND' || type === 'INTEREST_TENDER_BOND';
  if (filter === 'REPO') return type === 'REPO' || type === 'SYSTEM_REPO';
  return type === filter;
}

/** Name or ASIN contains the search term (lists loaded in full are filtered here, not on the server). */
export function matchesSearch(r: MarketRow, search: string | undefined): boolean {
  const q = (search ?? '').trim().toLowerCase();
  if (q.length < 2) return true;
  return r.listing.name.toLowerCase().includes(q) || r.listing.securityIdentifier.toLowerCase().includes(q);
}

/** Running bonds as market rows (the spread search does not list bonds); repos come without prices. */
export function bondRows(bonds: BondView[], now: number, repos = false): MarketRow[] {
  return bonds
    .filter((b) => b.maturityDate > now)
    .flatMap((b): MarketRow[] => {
      if (repos) return b.repurchaseListing ? [{ listing: { ...b.repurchaseListing, type: b.repurchaseListing.type ?? 'REPO' } }] : [];
      const s = b.priceSpread;
      return [
        {
          listing: { ...b.listing, type: b.listing.type ?? 'BOND' },
          bidPrice: s?.bidPrice ?? null,
          bidSize: s?.bidSize ?? null,
          askPrice: s?.askPrice ?? null,
          askSize: s?.askSize ?? null,
          lastPrice:
            s?.lastPrice == null
              ? null
              : typeof s.lastPrice === 'number'
                ? { value: s.lastPrice, date: 0 }
                : { value: s.lastPrice.value, date: s.lastPrice.date ?? 0 },
        },
      ];
    });
}

/** Merges row lists, first occurrence of an ASIN wins. */
export function uniqueRows(...lists: MarketRow[][]): MarketRow[] {
  const seen = new Set<string>();
  return lists.flat().filter((r) => !seen.has(r.listing.securityIdentifier) && !!seen.add(r.listing.securityIdentifier));
}
