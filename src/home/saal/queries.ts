// Data of the „Börsensaal“ start page that no shared hook fetches (keys prefixed 'home-saal').
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';
import type { ListingWithTradingVolumeView, TradingMatrixItemView } from '../../api/types';

type Page<T> = { content: T[] };

/** GET on a Spring-paged endpoint with flat paging parameters (?type=STOCK&page=0&size=100). */
function page<T>(path: string, query: Record<string, string | number>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return unwrap<Page<T>>((api.GET as any)(path, { params: { query } }));
}

/**
 * The most traded shares and the coin by € volume in 24 h, in the shape of the trading matrix. Not
 * /api/v2/tradingmatrix/top100: it took 5–11 s whenever the server had nothing cached (30.09.2026) and
 * the whole board waited for it; biggesttradedsecurities answers in under a second.
 */
export function useMostTraded() {
  return useQuery({
    queryKey: ['home-saal', 'most-traded'],
    queryFn: async (): Promise<TradingMatrixItemView[]> => {
      const [stocks, coins] = await Promise.all([
        page<ListingWithTradingVolumeView>('/api/v2/biggesttradedsecurities', { type: 'STOCK', page: 0, size: 100 }),
        page<ListingWithTradingVolumeView>('/api/v2/biggesttradedsecurities', { type: 'COIN', page: 0, size: 5 }),
      ]);
      return [...stocks.content, ...coins.content].map((r) => ({
        securityIdentifier: r.listing?.securityIdentifier ?? r.securityIdentifier,
        name: r.listing?.name ?? r.name,
        lastPrice: r.lastPrice?.value,
        volume24h: r.volume,
      }));
    },
    refetchInterval: 15_000, // the board shows their last price
  });
}
