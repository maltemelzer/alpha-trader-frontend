// The transfer checked on the wire (method, path, query) against a stubbed fetch – nothing reaches the live game.
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const calls = vi.hoisted(() => {
  const list: { method: string; url: URL }[] = [];
  vi.stubGlobal('fetch', async (input: Request) => {
    list.push({ method: input.method, url: new URL(input.url) });
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  return list;
});

import { useBankTransfer } from '../api/queries';

it('sends PUT /api/v2/banktransfer/{sender} with receiver account and amount', async () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => useBankTransfer(), { wrapper });
  await act(() => result.current.mutateAsync({ senderBankAccountId: 'bank-company', receiverBankAccountId: 'bank-esteban', cashAmount: 12345.67 }));
  await waitFor(() => expect(calls.length).toBe(1));
  expect(calls[0].method).toBe('PUT');
  expect(calls[0].url.pathname).toBe('/api/v2/banktransfer/bank-company');
  expect(Object.fromEntries(calls[0].url.searchParams)).toEqual({ receiverBankAccountId: 'bank-esteban', cashAmount: '12345.67' });
});
