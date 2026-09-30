import { bondSummary, changePct, pollKind, priceToBook, upcoming, valuationSeries } from './overview';
import { valuationChart } from './charts';
import type { CapitalMeasureView, DividendPaymentView, MergerView } from '../api/queries';

const DAY = 86_400_000;
const NOW = Date.parse('2026-09-25T20:00:00Z');
const co = (id: string, name = id) => ({ id, name, securityIdentifier: `ST${id}` });

describe('valuationSeries', () => {
  // Alphakasse SE, real daily values: book value per share had a one-day outlier on 07.09.
  const history = [
    { date: '2026-09-06T18:48:00Z', bookValuePerShare: 1 },
    { date: '2026-09-07T18:48:00Z', bookValuePerShare: 876627.97 },
    { date: '2026-09-08T18:48:00Z', bookValuePerShare: 2.19 },
    { date: '2026-09-24T18:48:00Z', bookValuePerShare: 19.24 },
    { date: '2026-09-25T18:49:00Z', bookValuePerShare: 22.27 },
  ];
  const daily = [
    { date: '2026-09-06T00:00:00Z', closePrice: 1 },
    { date: '2026-09-08T00:00:00Z', closePrice: 23.64 },
    { date: '2026-09-24T00:00:00Z', closePrice: 57.34 },
    { date: '2026-09-25T00:00:00Z', closePrice: 71.24 },
  ];

  it('drops the book value outlier, appends the live price and keeps the range', () => {
    const s = valuationSeries(history, daily, 30, NOW, { value: 71.96, date: NOW - 1000 });
    expect(s.book.map((p) => p.value)).toEqual([1, 2.19, 19.24, 22.27]);
    expect(s.price.map((p) => p.value)).toEqual([1, 23.64, 57.34, 71.24, 71.96]);
    const short = valuationSeries(history, daily, 3, NOW);
    expect(short.price.map((p) => p.value)).toEqual([57.34, 71.24]);
    expect(short.book.map((p) => p.value)).toEqual([19.24, 22.27]);
  });

  it('ignores a live price older than the last close', () => {
    expect(valuationSeries([], daily, 30, NOW, { value: 5, date: Date.parse('2026-09-01') }).price).toHaveLength(4);
    expect(valuationSeries(undefined, undefined, 30, NOW)).toEqual({ price: [], book: [] });
  });
});

describe('changePct / priceToBook', () => {
  it('computes the change over the range and the KBV', () => {
    expect(changePct([{ value: 50, date: 1 }, { value: 75, date: 2 }])).toBe(50);
    expect(changePct([{ value: 50, date: 1 }])).toBeUndefined();
    expect(changePct([{ value: 0, date: 1 }, { value: 3, date: 2 }])).toBeUndefined();
    expect(priceToBook(71.96, 22.19)).toBeCloseTo(3.243, 3);
    expect(priceToBook(10, 0)).toBeUndefined();
    expect(priceToBook(10, -2)).toBeUndefined();
    expect(priceToBook(undefined, 2)).toBeUndefined();
  });
});

describe('bondSummary', () => {
  it('sums running bonds, weights the interest by volume, finds the next maturity', () => {
    const s = bondSummary(
      [
        { listing: { securityIdentifier: 'BOA' }, volume: 100000, interestRate: 2, maturityDate: NOW + 2 * DAY },
        { listing: { securityIdentifier: 'BOB' }, volume: 300000, interestRate: 4, maturityDate: NOW + 3_600_000 },
        { listing: { securityIdentifier: 'BOC' }, volume: 500000, interestRate: 9, maturityDate: NOW - 1 },
      ],
      NOW,
    );
    expect(s).toEqual({ count: 2, volume: 400000, rate: 3.5, nextMaturity: NOW + 3_600_000, nextAsin: 'BOB', dueToday: 1 });
    expect(bondSummary(undefined, NOW)).toMatchObject({ count: 0, volume: 0, rate: undefined, nextAsin: undefined });
  });
});

describe('pollKind', () => {
  it('derives the kind from the fields like the DS', () => {
    expect(pollKind({ id: '1', capitalIncreaseType: 'WITH_SUBSCRIPTION_RIGHTS' })).toBe('CAPITAL_INCREASE');
    expect(pollKind({ id: '1', dailyWage: 5 })).toBe('EMPLOY_CEO');
    expect(pollKind({ id: '1', numberOfShares: 5, price: 2 })).toBe('CAPITAL_REDUCTION');
    expect(pollKind({ id: '1', maximalCashVolume: 5 })).toBe('DIVIDEND_PAYMENT');
    expect(pollKind({ id: '1', kind: 'LIQUIDATION' })).toBe('LIQUIDATION');
    expect(pollKind({ id: '1' })).toBe('OTHER');
  });
});

describe('upcoming', () => {
  const measure = (id: string, company: string, start: number, end: number): CapitalMeasureView => ({
    id, numberOfShares: 1, price: 1, cashVolume: 1, startDate: start, endDate: end, company: co(company),
  });
  it('collects this company’s polls, measures, dividends, mergers and bonds, soonest first', () => {
    const mergers: MergerView[] = [
      { id: 'm1', maximalCashVolume: 0, startDate: NOW + 5 * DAY, company: co('x', 'Zeta Inc.'), acquiringCompany: co('me') },
      { id: 'm2', maximalCashVolume: 0, startDate: NOW + 4 * DAY, company: co('y', 'Alpha Inc.'), acquiringCompany: co('me') },
      { id: 'm3', maximalCashVolume: 0, startDate: NOW + 6 * DAY, company: co('me'), acquiringCompany: co('big', 'Big AG') },
      { id: 'm4', maximalCashVolume: 0, startDate: NOW + 1 * DAY, company: co('a'), acquiringCompany: co('b') },
    ];
    const dividends: DividendPaymentView[] = [
      { id: 'd1', maximalCashVolume: 1, startDate: NOW + 2 * DAY, company: co('me') },
      { id: 'd2', maximalCashVolume: 1, startDate: NOW - DAY, company: co('me') },
    ];
    const items = upcoming(
      'me',
      {
        polls: [
          { id: 'p1', endDate: NOW + 3 * 3_600_000, maximalCashVolume: 5, castVotesPercentage: 41.6 },
          { id: 'p2', endDate: NOW - 1 },
        ],
        increases: [measure('i1', 'me', NOW - DAY, NOW + DAY / 2), measure('i2', 'other', NOW, NOW + DAY)],
        reductions: [measure('r1', 'me', NOW + 3 * DAY, NOW + 4 * DAY)],
        dividends,
        mergers,
        bonds: { count: 1, volume: 1, nextMaturity: NOW + 7 * DAY, dueToday: 0 },
        pollKinds: { DIVIDEND_PAYMENT: 'Gewinnausschüttung' },
        asin: 'STME',
      },
      NOW,
    );
    expect(items.map((i) => [i.id, i.label])).toEqual([
      ['poll-p1', 'Abstimmung: Gewinnausschüttung'],
      ['increase-i1', 'Kapitalerhöhung läuft bis'],
      ['dividend-d1', 'Gewinnausschüttung'],
      ['reduction-r1', 'Kapitalherabsetzung beginnt'],
      ['takeovers', 'Übernimmt Alpha Inc. und 1 weitere'],
      ['merger-m3', 'Fusion mit Big AG'],
      ['bond-next', 'Nächste Anleihe fällig'],
    ]);
    expect(items[0]).toMatchObject({ detail: '42 % abgestimmt', href: '/wertpapier/STME?ansicht=abstimmungen' });
    expect(items.find((i) => i.id === 'reduction-r1')).toMatchObject({ date: NOW + 3 * DAY, until: NOW + 4 * DAY });
  });
});

describe('valuationChart', () => {
  const theme = { tokens: (n: string) => n, layout: { xaxis: {}, yaxis: {}, legend: {} } } as unknown as Parameters<typeof valuationChart>[0];
  const s = {
    price: [{ value: 10, date: NOW - DAY }, { value: 12, date: NOW }],
    book: [{ value: 4, date: NOW - DAY }, { value: 5, date: NOW }],
  };
  it('draws price in its direction colour and book value in ink blue, labels the ends and clips the x range', () => {
    const f = valuationChart(theme, 800, s);
    expect(f.data.map((d) => d.line.color)).toEqual(['gain', 'chart-2']);
    expect(f.layout.annotations.map((a) => a.text)).toEqual(['Kurs 12,00 €', 'Buchwert 5,00 €']);
    expect(f.layout.xaxis.range).toEqual([new Date(NOW - DAY), new Date(NOW)]);
    expect(valuationChart(theme, 800, { ...s, price: [...s.price].reverse() }).data[0].line.color).toBe('loss');
  });
  it('uses a legend instead of end labels on phones', () => {
    const f = valuationChart(theme, 360, s);
    expect(f.layout.showlegend).toBe(true);
    expect(f.layout.annotations).toEqual([]);
  });
});
