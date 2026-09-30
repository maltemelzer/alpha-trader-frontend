// „Mein Tag“: the same reads as src/api/queries.ts, but for several accounts at once. Query keys are
// those of the single-account hooks (useAccountPortfolio, useOpenOrders, useOrderLogs), so the cache is shared.
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';
import type { PortfolioView } from '../../api/types';
import type { SecurityOrderView, TradeLogEntry } from '../../../design-system/components';

type Page<T> = { content: T[]; totalElements: number };

// Spring's Pageable is sent flat (?page=0&size=50&sort=date,desc).
function flat(q: Record<string, unknown>) {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (k === 'pageable' && v && typeof v === 'object') {
      for (const [pk, pv] of Object.entries(v)) for (const item of Array.isArray(pv) ? pv : [pv]) out.append(pk, String(item));
    } else if (v !== undefined) out.append(k, String(v));
  }
  return out.toString();
}

function getPage<T>(path: string, query: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return unwrap<Page<T>>((api.GET as any)(path, { params: { query }, querySerializer: flat }));
}

const SLOW = 60_000;

// Module-level combine functions: TanStack Query keeps their result stable while the data is unchanged.
const portfolios = (rs: UseQueryResult<PortfolioView>[]) => rs.map((r) => r.data);
const orderCount = (rs: UseQueryResult<Page<SecurityOrderView>>[]) =>
  rs.reduce((n, r) => n + (r.data?.totalElements ?? r.data?.content.length ?? 0), 0);
const logRows = (rs: UseQueryResult<Page<TradeLogEntry>>[]) => rs.flatMap((r) => r.data?.content ?? []);
const LIVE = 15_000;

/** Portfolios of the companies the player runs (GET /api/portfolios/{securitiesAccountId}). */
export function useAccountPortfolios(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ['portfolio', 'account', id],
      queryFn: () =>
        unwrap<PortfolioView>(api.GET('/api/portfolios/{securitiesAccountId}', { params: { path: { securitiesAccountId: id } } })),
      refetchInterval: SLOW,
    })),
    combine: portfolios,
  });
}

/** Open orders of several accounts (without the account the API lists everybody's). */
export function useOpenOrdersOf(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ['orders', id],
      queryFn: () =>
        getPage<SecurityOrderView>('/api/v2/securityorders', {
          securitiesAccountId: id,
          pageable: { page: 0, size: 100, sort: ['creationDate,desc'] },
        }),
      refetchInterval: LIVE,
    })),
    combine: orderCount,
  });
}

/** The latest own trades of several accounts. */
export function useOrderLogsOf(ids: string[], size = 20) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ['orderlogs', id, size],
      queryFn: () =>
        getPage<TradeLogEntry>('/api/v2/securityorderlogs', {
          securitiesAccountId: id,
          pageable: { page: 0, size, sort: ['date,desc'] },
        }),
      refetchInterval: SLOW,
    })),
    combine: logRows,
  });
}
