import type { MarketRow } from '../api/queries';
import type { ListingWithTradingVolumeView, SecurityOrderLogEntryView, TradingMatrixItemView } from '../api/types';
import type { BondView, MarketFilterValue, MarketResult, TickerItem } from '../../vendor/bankiersgruen';
import { dailyYield, LAST_HOUR } from '../security/derive';

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

export function toResult(r: MarketRow): MarketResult & { yieldPerDay?: number | null } {
  return {
    yieldPerDay: r.yieldPerDay,
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
          maturityDate: b.maturityDate,
          yieldPerDay: dailyYield(s?.askPrice, b.interestRate ?? 0, b.maturityDate - now) ?? null,
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

/**
 * Bonds with the best yield per day first – only those buyable now (ask) and due in an hour or
 * later; the last hour (2 % on minutes read as 2.000 % per day) and bonds without ask follow in
 * their previous order.
 */
export function byYield(rows: MarketRow[], now: number): MarketRow[] {
  const ranked = rows.filter((r) => r.yieldPerDay != null && (r.maturityDate ?? 0) - now >= LAST_HOUR);
  const rest = rows.filter((r) => !ranked.includes(r));
  return [...ranked.sort((a, b) => b.yieldPerDay! - a.yieldPerDay!), ...rest];
}

// ---------- Market overview ----------

/** German names of listing types (Umsatz view footer). */
export const TYPE_LABEL: Record<string, string> = {
  STOCK: 'Aktien',
  BOND: 'Anleihen',
  REPO: 'Repos',
  COIN: 'Coins',
  INDEX: 'Indizes',
  ETF: 'ETFs',
  WARRANT: 'Optionsscheine',
  BUILDING: 'Immobilien',
};

/** „Building 1200 20/09/2026“ → „Gebäude 1200 (20.09.)“; other names trimmed. */
export function displayName(name: string): string {
  const n = name.trim();
  const m = n.match(/^Building (\d+) (\d{2})\/(\d{2})\/\d{4}$/);
  return m ? `Gebäude ${m[1]} (${m[2]}.${m[3]}.)` : n;
}

/**
 * Breaks a tile label into at most two lines of about `width` characters at spaces (Plotly treemap
 * text does not wrap; a long one-line name hides the label even in large tiles). The rest is cut with „…“.
 */
export function wrapLabel(name: string, width: number): string {
  const words = name.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if (line && (line + ' ' + w).length > width) {
      lines.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) lines.push(line);
  const cut = (l: string) => (l.length > width ? l.slice(0, width - 1) + '…' : l);
  if (lines.length <= 2) return lines.map(cut).join('<br>');
  return [cut(lines[0]), cut(lines.slice(1).join(' ').slice(0, width - 1) + '…')].join('<br>');
}

export interface HeatTile {
  asin: string;
  name: string;
  last: number;
  /** Change against the price 24 h ago in %, null for new listings (no previous price). */
  change: number | null;
  volume: number;
}

/** Heatmap tiles from the trading matrix: only traded securities, largest volume first. */
export function heatTiles(items: TradingMatrixItemView[]): HeatTile[] {
  return items
    .filter((i) => i.securityIdentifier && (i.volume24h ?? 0) > 0 && i.lastPrice != null)
    .map((i) => ({
      asin: i.securityIdentifier!,
      name: displayName(i.name ?? i.securityIdentifier!),
      last: i.lastPrice!,
      change: i.previousPrice ? (i.lastPrice! / i.previousPrice - 1) * 100 : null,
      volume: i.volume24h!,
    }))
    .sort((a, b) => b.volume - a.volume);
}

/**
 * Tile area. Volumes span seven orders of magnitude (AlphaCoins alone ~95 % of the top 100),
 * so the area follows the fourth root: order stays, small tiles remain visible.
 */
export function tileArea(volume: number): number {
  return Math.pow(Math.max(0, volume), 0.25);
}

/**
 * How much of gain/loss goes into the tint (design rule 11: mix, at most 42 %).
 * Grows linearly up to `cap` % change; no share for moves that round to 0,00 %.
 */
export function heatShare(change: number | null, cap = 10, max = 0.42): number {
  if (change == null || Math.abs(change) < 0.005) return 0;
  return max * Math.min(1, Math.abs(change) / cap);
}

export interface VolumeRow {
  asin: string;
  name: string;
  type: string;
  volume: number;
}

/** Biggest traded securities as bar rows (only with volume), biggest first. */
export function volumeRows(content: ListingWithTradingVolumeView[], n = 8): VolumeRow[] {
  return content
    .map((r) => ({
      asin: r.listing?.securityIdentifier ?? r.securityIdentifier ?? '',
      name: displayName(r.listing?.name ?? r.name ?? ''),
      type: r.listing?.type ?? r.type ?? '',
      volume: r.volume ?? 0,
    }))
    .filter((r) => r.asin && r.volume > 0)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, n);
}
