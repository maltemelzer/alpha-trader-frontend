// The write actions of the settings page, checked on the wire: method, path and query – against a
// stubbed fetch, so nothing reaches the live game.
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const calls = vi.hoisted(() => {
  const list: { method: string; url: URL; body: string }[] = [];
  // openapi-fetch keeps the fetch it finds when the client is created, so stub before any import.
  vi.stubGlobal('fetch', async (input: Request) => {
    list.push({ method: input.method, url: new URL(input.url), body: await input.clone().text() });
    return new Response(JSON.stringify({ days: 30 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  return list;
});

import { useAccountActions } from '../api/queries';

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return renderHook(() => useAccountActions(), { wrapper }).result;
}

async function last(run: () => Promise<unknown>) {
  calls.length = 0;
  await act(run);
  await waitFor(() => expect(calls.length).toBe(1));
  const c = calls[0];
  return { method: c.method, path: c.url.pathname, query: Object.fromEntries(c.url.searchParams), body: c.body };
}

describe('account write requests', () => {
  it('changes one user field with PATCH /api/v2/my/user', async () => {
    const a = setup();
    expect(await last(() => a.current.changeUser.mutateAsync({ username: 'Neu' }))).toMatchObject({
      method: 'PATCH',
      path: '/api/v2/my/user',
      query: { username: 'Neu' },
    });
    expect(await last(() => a.current.changeUser.mutateAsync({ emailSubscriptionType: 'UNSUBSCRIBED' }))).toMatchObject({
      query: { emailSubscriptionType: 'UNSUBSCRIBED' },
    });
  });

  it('sets the language with PUT /api/locale', async () => {
    const a = setup();
    expect(await last(() => a.current.setLocale.mutateAsync('en-US'))).toMatchObject({ method: 'PUT', path: '/api/locale', query: { locale: 'en-US' } });
  });

  it('writes notes as user preferences', async () => {
    const a = setup();
    const q = { type: 'NOTE', identifier: 'STSN3G03LB', content: 'x' };
    expect(await last(() => a.current.saveNote.mutateAsync({ method: 'POST', query: q }))).toMatchObject({ method: 'POST', path: '/api/v2/userpreferences', query: q });
    expect(await last(() => a.current.saveNote.mutateAsync({ method: 'PUT', id: 'p1', query: q }))).toMatchObject({ method: 'PUT', path: '/api/v2/userpreferences/p1', query: q });
    expect(await last(() => a.current.saveNote.mutateAsync({ method: 'DELETE', id: 'p1' }))).toMatchObject({ method: 'DELETE', path: '/api/v2/userpreferences/p1', query: {} });
  });

  it('sets the referrer, redeems a voucher', async () => {
    const a = setup();
    expect(await last(() => a.current.setReferrer.mutateAsync('REF1'))).toMatchObject({ method: 'PATCH', path: '/api/v2/my/referrer/REF1' });
    expect(await last(() => a.current.redeemLicense.mutateAsync('GIFT-1'))).toMatchObject({ method: 'PATCH', path: '/api/v2/premiumlicenses/GIFT-1' });
  });

  it('manages a subscription by e-mail code', async () => {
    const a = setup();
    expect(await last(() => a.current.sendSubscriptionCode.mutateAsync('a@b.de'))).toMatchObject({
      method: 'POST',
      path: '/api/v2/subscriptions/verify-email',
      body: '"a@b.de"',
    });
    expect(await last(() => a.current.subscriptionStatus.mutateAsync({ email: 'a@b.de', code: '123' }))).toMatchObject({
      method: 'GET',
      path: '/api/v2/subscriptions/status',
      query: { email: 'a@b.de', code: '123' },
    });
    expect(await last(() => a.current.cancelSubscription.mutateAsync('sub_1'))).toMatchObject({ method: 'POST', path: '/api/v2/subscriptions/cancel', body: '"sub_1"' });
  });

  it('asks for the deletion link first and deletes only with the token', async () => {
    const a = setup();
    expect(await last(() => a.current.deleteAccount.mutateAsync(undefined))).toMatchObject({ method: 'DELETE', path: '/api/v2/my/user', query: {} });
    expect(await last(() => a.current.deleteAccount.mutateAsync('tok'))).toMatchObject({ method: 'DELETE', query: { deletionToken: 'tok' } });
  });
});
