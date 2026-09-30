import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';
import type { ListingWithTradingVolumeView } from '../../api/types';
import type { SecurityOrderLogEntryView } from '../../api/types';
import type { ListingRow } from './derive';

type Page<T> = { content: T[]; totalElements: number };

/** Spring's Pageable flat (?page=0&size=30), like the shared queries send it. */
const flat = (q: Record<string, unknown>) => {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined) out.append(k, String(v));
  return out.toString();
};

/**
 * Rows per district: more shares than the city shows (news companies and own positions just below still
 * get their volume), enough buildings to sum the volume per size.
 */
const SIZES = { STOCK: 80, COIN: 3, BUILDING: 400 } as const;

/** The busiest securities of each district (GET /api/v2/biggesttradedsecurities?type=…, 24 h volume, largest first). */
export function useCityListings() {
  return useQuery({
    queryKey: ['home-skyline', 'listings'],
    queryFn: async (): Promise<ListingRow[]> => {
      const types = Object.keys(SIZES) as (keyof typeof SIZES)[];
      const pages = await Promise.all(
        types.map((type) =>
          unwrap<Page<ListingWithTradingVolumeView>>(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (api.GET as any)('/api/v2/biggesttradedsecurities', {
              params: { query: { type, page: 0, size: SIZES[type] } },
              querySerializer: flat,
            }),
          ),
        ),
      );
      return pages
        .flatMap((p) => p.content)
        .map((r) => ({
          asin: r.listing?.securityIdentifier ?? r.securityIdentifier ?? '',
          name: r.listing?.name ?? r.name ?? '',
          type: r.listing?.type ?? r.type ?? '',
          volume: r.volume ?? null,
          price: r.lastPrice?.value ?? null,
        }))
        .filter((r) => r.asin)
        .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
    },
    placeholderData: (prev) => prev,
    refetchInterval: 60_000,
  });
}

/**
 * The market's trades of the last ten minutes, once on arrival (the shared live feed starts with two
 * minutes): at most 1.000 per call, so a second call goes further back from the oldest one seen.
 */
export function useTradeSeed() {
  return useQuery({
    queryKey: ['home-skyline', 'seed'],
    queryFn: async () => {
      const start = Date.now() - 10 * 60_000;
      const get = (endDate?: number) =>
        unwrap<SecurityOrderLogEntryView[]>(
          api.GET('/api/securityorderlogs', {
            params: { query: { startDate: String(start), ...(endDate ? { endDate: String(endDate) } : {}) } },
          }),
        );
      const first = await get();
      if (first.length < 1000) return first;
      const oldest = Math.min(...first.map((t) => t.date ?? Infinity));
      return [...first, ...(await get(oldest))];
    },
    staleTime: Infinity,
    gcTime: 5 * 60_000,
  });
}
