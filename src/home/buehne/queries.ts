// Start page „Bühne“: the two reads the shared hooks do not cover in the size the stage needs.
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';
import type { HistorizedListingDataView, SecurityOrderLogEntryView } from '../../api/types';
import { mergeTrades } from '../../app/tape';
import type { MarketLine } from './derive';

const LIVE = 15_000;
const SLOW = 60_000;
const KEEP_MS = 30 * 60_000;

type Page<T> = { content: T[] };
interface Row {
  listing: { name: string; securityIdentifier: string; type: string; startDate?: number };
  lastPrice?: { value: number } | null;
  priceChangeInPercent?: number;
  volume?: number;
}

/** GET on a Spring-paged endpoint with flat paging parameters (?page=0&size=150). */
function page<T>(path: string, query: Record<string, string | number | boolean>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return unwrap<Page<T>>((api.GET as any)(path, { params: { query } }));
}

/**
 * Trades of the whole market for the last ~30 minutes: first everything since 15 minutes ago (the server
 * returns the newest 1.000, a few minutes), then only what came after the newest known trade.
 */
export function useStageTrades() {
  const qc = useQueryClient();
  return useQuery({
    queryKey: ['home-buehne', 'trades'],
    queryFn: async () => {
      const prev = qc.getQueryData<SecurityOrderLogEntryView[]>(['home-buehne', 'trades']) ?? [];
      const now = Date.now();
      const since = prev[0]?.date ?? now - 15 * 60_000;
      const fresh = await unwrap<SecurityOrderLogEntryView[]>(
        api.GET('/api/securityorderlogs', { params: { query: { startDate: String(since) } } }),
      );
      return mergeTrades(fresh, prev, 6000).filter((t) => (t.date ?? 0) > now - KEEP_MS);
    },
    refetchInterval: LIVE,
  });
}

/**
 * Moves against the last daily close (both directions, 150 each) joined with the 24 h turnover of the
 * 400 most traded stocks and the coins – a move only counts with turnover behind it. `listed`: the traded
 * stocks with their listing date, for new listings (no extra request).
 */
export function useMoverBoard() {
  return useQuery({
    queryKey: ['home-buehne', 'movers'],
    queryFn: async (): Promise<{ movers: MarketLine[]; listed: MarketLine[] }> => {
      const [up, down, stocks, coins] = await Promise.all([
        page<Row>('/api/v2/securitieswithbigpricechanges', { losersFirst: false, page: 0, size: 150 }),
        page<Row>('/api/v2/securitieswithbigpricechanges', { losersFirst: true, page: 0, size: 150 }),
        page<Row>('/api/v2/biggesttradedsecurities', { type: 'STOCK', page: 0, size: 400 }),
        page<Row>('/api/v2/biggesttradedsecurities', { type: 'COIN', page: 0, size: 10 }),
      ]);
      const volume = new Map<string, number>();
      for (const r of [...stocks.content, ...coins.content]) volume.set(r.listing.securityIdentifier, r.volume ?? 0);
      const movers = [...up.content, ...down.content].map((r) => ({
        asin: r.listing.securityIdentifier,
        name: r.listing.name,
        type: r.listing.type,
        price: r.lastPrice?.value,
        change: r.priceChangeInPercent,
        volume: volume.get(r.listing.securityIdentifier),
      }));
      const listed = stocks.content.map((r) => ({
        asin: r.listing.securityIdentifier,
        name: r.listing.name,
        type: r.listing.type,
        price: r.lastPrice?.value,
        volume: r.volume,
        listed: r.listing.startDate,
      }));
      return { movers, listed };
    },
    refetchInterval: SLOW,
  });
}

/**
 * Daily history of several listings (same cache entry as useDailyHistory, oldest first) and whether each
 * one has settled – a failed request counts as settled, so a scene never waits for it forever.
 */
export function useCloses(asins: string[]) {
  return useQueries({
    queries: asins.map((asin) => ({
      queryKey: ['history', asin],
      queryFn: async () => {
        const page = await unwrap<{ content: HistorizedListingDataView[] }>(
          api.GET('/api/v2/historizedlistingdata/{securityIdentifier}', {
            params: { path: { securityIdentifier: asin }, query: { page: 0, size: 365, sort: 'date,desc' } as never },
          }),
        );
        return [...page.content].reverse();
      },
      staleTime: SLOW,
    })),
    combine: (results) => {
      const data: Record<string, HistorizedListingDataView[] | undefined> = {};
      const settled: Record<string, boolean> = {};
      asins.forEach((a, i) => {
        data[a] = results[i]?.data;
        settled[a] = !!results[i] && !results[i].isPending;
      });
      return { data, settled };
    },
  });
}

/**
 * All trades of one security since `since` (the last daily close), once per scene: up to three pages of
 * 1.000, newest first, each further page ending at the oldest trade seen. The chart's own polling stays small.
 */
export function useTradesSince(asin: string | undefined, since: number | undefined) {
  return useQuery({
    queryKey: ['home-buehne', 'since', asin, since],
    enabled: !!asin && !!since,
    queryFn: async () => {
      const seen = new Map<string, SecurityOrderLogEntryView>();
      let end: number | undefined;
      for (let page = 0; page < 3; page++) {
        const query: Record<string, string> = { securityIdentifier: asin!, startDate: String(since) };
        if (end) query.endDate = String(end);
        const rows = await unwrap<SecurityOrderLogEntryView[]>(api.GET('/api/securityorderlogs', { params: { query } }));
        let oldest = Infinity;
        for (const t of rows) {
          seen.set(t.id ?? `${t.date}-${t.price}`, t);
          oldest = Math.min(oldest, t.date ?? Infinity);
        }
        if (rows.length < 1000 || !Number.isFinite(oldest) || oldest === end) break;
        end = oldest;
      }
      return [...seen.values()];
    },
    staleTime: 10 * 60_000,
  });
}
