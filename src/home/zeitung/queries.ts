// Start page „Zeitung“: the one read the shared hooks do not cover in the size the price list needs
// (keys prefixed 'home-zeitung').
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';
import type { ListRow } from './derive';

type Page<T> = { content: T[] };

/** GET on a Spring-paged endpoint with flat paging parameters (?page=0&size=300). */
function page<T>(path: string, query: Record<string, string | number | boolean>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return unwrap<Page<T>>((api.GET as any)(path, { params: { query } }));
}

/**
 * The shares and coins with the most € turnover in 24 h (300 shares – enough to give every move of the
 * movers lists its turnover – and the coin). Polled every minute like the other lists.
 */
export function useTraded() {
  return useQuery({
    queryKey: ['home-zeitung', 'traded'],
    queryFn: async (): Promise<ListRow[]> => {
      const [stocks, coins] = await Promise.all([
        page<ListRow>('/api/v2/biggesttradedsecurities', { type: 'STOCK', page: 0, size: 300 }),
        page<ListRow>('/api/v2/biggesttradedsecurities', { type: 'COIN', page: 0, size: 5 }),
      ]);
      return [...stocks.content, ...coins.content];
    },
    refetchInterval: 60_000,
  });
}

type LogRow = { id?: string; securityIdentifier?: string; price?: number; date?: number };

/**
 * All trades of one security since `since` (the last close), loaded once per lead: the log gives the newest
 * 1.000 per call, so it pages back with `endDate` = the oldest seen – at most three pages. Later trades come
 * from the live feed.
 */
export function useTradesSince(asin: string, since: number | undefined) {
  return useQuery({
    queryKey: ['home-zeitung', 'since', asin, since],
    enabled: !!asin && since != null,
    staleTime: Infinity,
    queryFn: async (): Promise<LogRow[]> => {
      const out = new Map<string, LogRow>();
      let end: number | undefined;
      for (let page = 0; page < 3; page++) {
        const query: Record<string, string> = { securityIdentifier: asin, startDate: String(since) };
        if (end != null) query.endDate = String(end);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = await unwrap<LogRow[]>((api.GET as any)('/api/securityorderlogs', { params: { query } }));
        for (const r of rows) out.set(r.id ?? `${r.date}-${r.price}`, r);
        if (rows.length < 1000) break;
        const oldest = Math.min(...rows.map((r) => r.date ?? Infinity));
        if (end != null && oldest >= end) break;
        end = oldest;
      }
      return [...out.values()];
    },
  });
}
