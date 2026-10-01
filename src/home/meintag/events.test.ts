import { describe, expect, it } from 'vitest';
import type { LedgerRow } from '../../me/bank';
import type { Holding } from './derive';
import {
  DAY,
  HOUR,
  futureEvents,
  nextVisit,
  pastEvents,
  pastFrom,
  shortName,
  placeLabels,
  ticks,
  xOf,
  type DayEvent,
  type PastInput,
  type Scale,
} from './events';

const now = 1_800_000_000_000;

const past = (extra: Partial<PastInput> = {}): PastInput => ({
  now,
  from: now - DAY,
  accounts: ['me'],
  fills: [],
  names: { STA: 'Alphakasse' },
  types: { STA: 'STOCK', BOX: 'BOND' },
  ledger: [],
  news: [],
  chats: [],
  threads: [],
  ...extra,
});

const row = (extra: Partial<LedgerRow>): LedgerRow => ({
  id: 'r',
  date: now - HOUR,
  amount: 100,
  category: 'gehalt',
  text: 'Gehalt von Fortune',
  subject: 'Fortune',
  balance: 0,
  ...extra,
});

const holding = (asin: string, extra: Partial<Holding>): Holding => ({ asin, name: asin, type: 'BOND', value: 1000, shares: 10, avg: 0, accounts: ['Privat'], ...extra });

describe('visits', () => {
  it('starts a new visit after a pause and keeps it on a reload', () => {
    expect(nextVisit(null, now)).toEqual({ seen: now });
    const back = nextVisit({ seen: now - 2 * HOUR }, now);
    expect(back).toEqual({ seen: now, prev: now - 2 * HOUR });
    expect(nextVisit(back, now + 5 * 60_000)).toEqual({ seen: now + 5 * 60_000, prev: now - 2 * HOUR });
  });

  it('shows at least 12 hours and at most 3 days back', () => {
    expect(pastFrom(now - HOUR, now)).toBe(now - 12 * HOUR);
    expect(pastFrom(now - 20 * HOUR, now)).toBe(now - 20 * HOUR);
    expect(pastFrom(now - 9 * DAY, now)).toBe(now - 3 * DAY);
    expect(pastFrom(undefined, now)).toBe(now - DAY);
  });
});

describe('pastEvents', () => {
  it('groups own fills per security, side and hour and leaves out transfers and own-to-own trades', () => {
    const h = Math.floor((now - 2 * HOUR) / HOUR) * HOUR;
    const ev = pastEvents(
      past({
        fills: [
          { date: h + 60_000, securityIdentifier: 'STA', numberOfShares: 10, price: 70, buyerSecuritiesAccount: 'me', sellerSecuritiesAccount: 'x' },
          { date: h + 120_000, securityIdentifier: 'STA', numberOfShares: 30, price: 72, buyerSecuritiesAccount: 'me', sellerSecuritiesAccount: 'y' },
          { date: h + 180_000, securityIdentifier: 'STA', numberOfShares: 5, price: 75, buyerSecuritiesAccount: 'z', sellerSecuritiesAccount: 'me' },
          { date: h + 240_000, securityIdentifier: 'STA', numberOfShares: 5, price: 0.01, buyerSecuritiesAccount: 'me', sellerSecuritiesAccount: 'x' },
          { date: h + 300_000, securityIdentifier: 'STA', numberOfShares: 5, price: 71, buyerSecuritiesAccount: 'me', sellerSecuritiesAccount: 'me' },
          { date: now - 2 * DAY, securityIdentifier: 'STA', numberOfShares: 5, price: 71, buyerSecuritiesAccount: 'me', sellerSecuritiesAccount: 'x' },
        ],
      }),
    );
    expect(ev.map((e) => e.title)).toEqual(['Verkauft: 5 × Alphakasse', 'Gekauft: 40 × Alphakasse']);
    expect(ev[1].detail).toBe('zu 71,50 €');
    expect(ev[1].amount).toBe(-2860);
    expect(ev[0].amount).toBe(375);
  });

  it('bundles fills of several bonds of one issuer', () => {
    const ev = pastEvents(
      past({
        names: { BO1: 'Micha8 Corp. 2.0500% 01/10/2026', BO2: 'Micha8 Corp. 2.0500% 02/10/2026' },
        types: { BO1: 'BOND', BO2: 'BOND' },
        fills: [
          { date: now - 5 * 60_000, securityIdentifier: 'BO1', numberOfShares: 5, price: 100, buyerSecuritiesAccount: 'me', sellerSecuritiesAccount: 'x' },
          { date: now - 4 * 60_000, securityIdentifier: 'BO2', numberOfShares: 5, price: 100, buyerSecuritiesAccount: 'me', sellerSecuritiesAccount: 'x' },
        ],
      }),
    );
    expect(ev.map((e) => [e.title, e.detail, e.amount])).toEqual([['Gekauft: 10 × Micha8 Corp.', 'zu 100,00\u00a0% · 2 Anleihen', -1000]]);
  });

  it('turns bookings into money events, without trades and fees', () => {
    const ev = pastEvents(
      past({
        ledger: [
          row({ id: 'a', category: 'anleihen', amount: 500, subject: 'Bond A', asin: 'BOA' }),
          row({ id: 'b', category: 'anleihen', amount: 700, subject: 'Bond B', asin: 'BOB', date: now - HOUR + 1000 }),
          row({ id: 'c', category: 'handel', amount: -900 }),
          row({ id: 'd', category: 'gebuehren', amount: -5 }),
          row({ id: 'e', category: 'gehalt', amount: 850, date: now - 3 * HOUR }),
        ],
      }),
    );
    expect(ev.map((e) => [e.title, e.amount, e.detail])).toEqual([
      ['2 Anleihen zurückgezahlt', 1200, 'Bond A, Bond B'],
      ['Gehalt eingegangen', 850, 'Fortune'],
    ]);
    expect(ev[0].href).toBe('/bank?art=anleihen');
  });

  it('takes unread chats, articles about own papers and forum threads in the window', () => {
    const ev = pastEvents(
      past({
        chats: [
          { id: 'c1', name: 'Händler', unread: 3, last: now - 10 * 60_000, from: 'ben' },
          { id: 'c2', unread: 0, last: now - 60_000 },
        ],
        news: [{ post: { id: 'n1', title: 'Alphakasse erhöht', dateCreated: now - 5 * HOUR }, about: 'Alphakasse' }],
        threads: [{ id: 't1', boardId: 'b', board: 'Allgemein', title: 'Frage', date: now - 2 * DAY, comments: 0 }],
      }),
    );
    expect(ev.map((e) => e.id)).toEqual(['chat:c1', 'news:n1']);
    expect(ev[0].detail).toBe('von ben · Händler');
  });
});

describe('futureEvents', () => {
  it('collects polls, maturities and company dates of own papers within the window', () => {
    const at = Math.floor((now + 3 * HOUR) / HOUR) * HOUR + 60_000;
    const ev = futureEvents({
      now,
      to: now + 2 * DAY,
      polls: [
        { id: 'p', company: 'Fortune', label: 'Fusion', endDate: now + HOUR },
        { id: 'old', company: 'X', label: 'Fusion', endDate: now - HOUR },
      ],
      holdings: [
        holding('BO1', { endDate: at }),
        holding('BO2', { endDate: at + 60_000 }),
        holding('WA1', { type: 'WARRANT', endDate: now + 5 * HOUR }),
        holding('ST1', { type: 'STOCK' }),
        holding('BO3', { endDate: now + 5 * DAY }),
      ],
      held: new Set(['STF', 'STG']),
      dates: [
        { id: 'm1', kind: 'merger', at: now + DAY, company: 'A', asin: 'STA', acquirer: 'Fortune', acquirerAsin: 'STF' },
        { id: 'm2', kind: 'merger', at: now + DAY + HOUR, company: 'B', asin: 'STB', acquirer: 'Fortune', acquirerAsin: 'STF' },
        { id: 'd1', kind: 'dividend', at: now + 6 * HOUR, company: 'G', asin: 'STG' },
        { id: 'd2', kind: 'dividend', at: now + 6 * HOUR, company: 'Fremd', asin: 'STX' },
      ],
    });
    expect(ev.map((e) => e.title)).toEqual([
      'Abstimmung endet: Fusion',
      '2 Anleihen werden fällig',
      'Optionsschein läuft aus',
      'Dividende von G',
      'Fortune übernimmt 2 Firmen',
    ]);
    expect(ev[1].amount).toBe(2000);
    expect(ev[4].detail).toBe('A, B');
  });
});

describe('scale', () => {
  const s: Scale = { from: now - DAY, now, to: now + 2 * DAY, nowX: 0.6 };

  it('puts „jetzt“ at nowX and the ends at the edges, near hours wider', () => {
    expect(xOf(s, now)).toBeCloseTo(0.6);
    expect(xOf(s, now - DAY)).toBeCloseTo(0);
    expect(xOf(s, now + 2 * DAY)).toBeCloseTo(1);
    // the last 6 hours take half of the past
    expect(xOf(s, now - 6 * HOUR)).toBeCloseTo(0.3);
  });

  it('keeps ticks apart and away from „jetzt“', () => {
    const t = ticks(s, 1000, 72);
    expect(t.map((x) => x.label)).toEqual(['vor 12 Std.', 'vor 6 Std.', 'vor 3 Std.', 'vor 1 Std.', 'in 3 Std.', 'in 12 Std.', 'in 1 Tag']);
    for (let i = 1; i < t.length; i++) expect(t[i].x - t[i - 1].x).toBeGreaterThanOrEqual(72);
    expect(t.every((x) => Math.abs(x.x - 600) >= 72)).toBe(true);
  });
});

describe('placeLabels', () => {
  const ev = (id: string, at: number, weight: number): DayEvent => ({ id, kind: 'news', at, title: id, href: '/', weight });

  it('gives the heaviest the nearest lane, avoids overlaps and keeps the rest as dots', () => {
    const { placed, dots } = placeLabels([ev('a', 100, 0.2), ev('b', 120, 0.9), ev('c', 140, 0.5), ev('d', 160, 0.1)], (t) => t, 1000, {
      lanes: 1,
      labelW: 200,
    });
    expect(placed.map((p) => [p.ev.id, p.lane])).toEqual([
      ['b', 1],
      ['c', -1],
    ]);
    expect(dots).toHaveLength(4);
  });

  it('turns labels near the right edge or past ones near „jetzt“ to the left of their dot', () => {
    const { placed } = placeLabels([ev('a', 950, 1), ev('b', 550, 0.5), ev('c', 300, 0.4)], (t) => t, 1000, { lanes: 2, labelW: 200, nowPx: 600 });
    expect(placed.map((p) => [p.ev.id, p.left])).toEqual([
      ['a', 750],
      ['b', 350],
      ['c', 300],
    ]);
  });
});

describe('shortName', () => {
  it('drops rate and date of a bond name', () => {
    expect(shortName('Micha8 Corp. 2.0500% 01/10/2026')).toBe('Micha8 Corp.');
    expect(shortName('Alphakasse SE')).toBe('Alphakasse SE');
  });
});
