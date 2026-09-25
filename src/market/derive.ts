import type { MarketRow } from '../api/queries';
import type { ListingWithTradingVolumeView, SecurityOrderLogEntryView, TradingMatrixItemView } from '../api/types';
import type { MarketResult, TickerItem } from '../../vendor/bankiersgruen';

/** Latest trades, newest first, as LiveTicker items; names come from whatever lists are loaded. */
export function tickerItems(
  trades: SecurityOrderLogEntryView[],
  names: Record<string, { name: string; type: string }>,
  max = 30,
): TickerItem[] {
  // Trades at a price of 0 are transfers, not market trades (like the Börsenband).
  return trades
    .filter((t) => (t.price ?? 0) > 0)
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
