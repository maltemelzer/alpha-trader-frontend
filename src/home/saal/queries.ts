// Data of the „Börsensaal“ start page that no shared hook fetches (keys prefixed 'home-saal').
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';
import type { TradingMatrixItemView } from '../../api/types';

/** The 100 securities with the most € volume in 24 h (shares, the coin, buildings) – small, polled like prices. */
export function useTradingMatrix() {
  return useQuery({
    queryKey: ['home-saal', 'matrix'],
    queryFn: () => unwrap<TradingMatrixItemView[]>(api.GET('/api/v2/tradingmatrix/top100')),
    refetchInterval: 15_000,
  });
}
