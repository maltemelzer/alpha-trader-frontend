import { describe, expect, it } from 'vitest';
import type { HistorizedListingDataView } from '../api/types';
import {
  bondDots,
  breadth,
  changeSince,
  classRows,
  closes,
  clusterLog,
  etfPair,
  indexBars,
  lastDays,
  moverDots,
  overviewKind,
  ratePerDay,
  repoDots,
  sumVolume,
  topShare,
} from './overview';
import { bondChart, classChart, coinChart, etfChart, indexChart, moversChart, repoChart } from './overviewCharts';
import type { ScreenRow } from './screener';

const NOW = 1_790_000_000_000;
const DAY = 86_400_000;

const row = (asin: string, o: Partial<ScreenRow> = {}): ScreenRow => ({
  asin,
  name: `Name ${asin}`,
  rawName: `Name ${asin}`,
  type: 'STOCK',
  group: 'STOCK',
  bid: null,
  bidSize: null,
  ask: null,
  askSize: null,
  last: null,
  spread: null,
  change: null,
  volume: null,
  trades: null,
  bookValue: null,
  rate: null,
  yieldPerDay: null,
  maturity: null,
  issuer: null,
  issuerAsin: null,
  size: null,
  perSqm: null,
  ...o,
});

const hist = (points: [number, number, number?][]): HistorizedListingDataView[] =>
  points.map(([day, close, volume]) => ({ date: new Date(NOW - day * DAY).toISOString(), closePrice: close, tradeVolume: volume ?? 0 }));

// Figures are plain objects for Plotly; the tests read single fields.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fig = { data: any[]; layout: any };
const fig = (f: unknown) => f as Fig;

const theme = { tokens: (n: string) => n, layout: { xaxis: {}, yaxis: {}, legend: {} } } as unknown as Parameters<typeof moversChart>[0];

describe('overviewKind', () => {
  it('gives each single class its overview, several classes the mixed one', () => {
    expect(overviewKind(['STOCK'])).toBe('stock');
    expect(overviewKind(['BOND'])).toBe('bond');
    expect(overviewKind(['REPO'])).toBe('repo');
    expect(overviewKind(['COIN'])).toBe('coin');
    expect(overviewKind(['INDEX'])).toBe('index');
    expect(overviewKind(['ETF'])).toBe('etf');
    expect(overviewKind([])).toBe('mixed');
    expect(overviewKind(['STOCK', 'BOND'])).toBe('mixed');
  });
  it('leaves buildings and warrants to their own views', () => {
    expect(overviewKind(['BUILDING'])).toBeNull();
    expect(overviewKind(['WARRANT'])).toBeNull();
  });
});

describe('shares', () => {
  const rows = [
    row('A', { volume: 1000, change: 5, trades: 10 }),
    row('B', { volume: 10, change: -2 }),
    row('C', { volume: 0, change: 0 }),
    row('D', { volume: 50, change: null }),
    row('E', { volume: 5, change: 0.001 }),
  ];
  it('dots are traded rows with a known change', () => {
    expect(moverDots(rows).map((d) => d.asin)).toEqual(['A', 'B', 'E']);
  });
  it('counts breadth, tiny changes as unchanged, unknown apart', () => {
    expect(breadth(rows)).toEqual({ up: 1, down: 1, flat: 2, unknown: 1 });
  });
  it('sums volumes and the share of the biggest', () => {
    expect(sumVolume(rows)).toBe(1065);
    expect(topShare(rows, 1)).toBeCloseTo(1000 / 1065);
    expect(topShare([row('X')], 3)).toBeUndefined();
  });
  it('the chart clips far moves to triangles and colours by direction', () => {
    const f = fig(moversChart(theme, 800, moverDots([...rows, row('F', { volume: 100, change: 300 })])));
    const up = f.data.find((d) => d.name === 'Gestiegen')!;
    expect(up.marker.color).toBe('gain');
    expect(Math.max(...up.y)).toBe(50);
    expect(up.marker.symbol).toContain('triangle-up');
    expect(f.data.find((d) => d.name === 'Gefallen')!.marker.color).toBe('loss');
  });
});

describe('bonds and repos', () => {
  const bonds = [
    row('BO1', { group: 'BOND', type: 'BOND', yieldPerDay: 0.5, maturity: NOW + 2 * DAY, rate: 1 }),
    row('SB1', { group: 'BOND', type: 'SYSTEM_BOND', yieldPerDay: 0.2, maturity: NOW + 6 * DAY, rate: 1.5 }),
    row('BO2', { group: 'BOND', type: 'BOND', yieldPerDay: null, maturity: NOW + DAY }),
    row('BO3', { group: 'BOND', type: 'BOND', yieldPerDay: 1, maturity: NOW - 1 }),
    row('RE1', { group: 'REPO', type: 'REPO', rate: 2, maturity: NOW + 4 * DAY }),
    row('SR1', { group: 'REPO', type: 'SYSTEM_REPO', rate: 1.48, maturity: NOW + DAY / 12 }),
  ];
  it('bond dots need a yield and a future maturity; system bonds are marked', () => {
    const d = bondDots(bonds, NOW);
    expect(d.map((x) => x.asin)).toEqual(['BO1', 'SB1']);
    expect(d[1].system).toBe(true);
    expect(d[0].left).toBe(2 * DAY);
  });
  it('repo dots carry the bond rate', () => {
    const d = repoDots(bonds, NOW);
    expect(d.map((x) => [x.asin, x.rate, x.system])).toEqual([
      ['RE1', 2, false],
      ['SR1', 1.48, true],
    ]);
  });
  it('rate per day divides by the days left', () => {
    expect(ratePerDay(2, 4 * DAY)).toBeCloseTo(0.5);
    expect(ratePerDay(2, 0)).toBeUndefined();
  });
  it('clusters a cohort of equal bonds into one dot, the first leads', () => {
    const cohort = Array.from({ length: 300 }, (_, i) => ({ id: i, x: 23 + i * 1e-4, y: 2.09, k: 'p' }));
    const c = clusterLog([...cohort, { id: 999, x: 23, y: 2.09, k: 's' }, { id: 1000, x: 5, y: 0.4, k: 'p' }], (d) => d.x, (d) => d.y, (d) => d.k);
    expect(c.map((x) => [x.lead.id, x.count])).toEqual([
      [0, 300],
      [999, 1],
      [1000, 1],
    ]);
  });
  it('the bond chart draws the reserve line and labels big clusters', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ ...bondDots(bonds, NOW)[0], asin: `X${i}` }));
    const f = fig(bondChart(theme, 800, many, 0.36, 0.5));
    expect(f.layout.shapes[0].y0).toBe(0.36);
    expect(f.layout.annotations.some((a: { text: string }) => a.text === '×12')).toBe(true);
    expect(f.data[0].customdata).toEqual(['X0']);
  });
  it('the repo chart adds the reserve line as rate = reserve × days', () => {
    const f = fig(repoChart(theme, 800, repoDots(bonds, NOW), 0.5));
    const line = f.data[0] as { x: number[]; y: number[] };
    expect(line.y[1] / line.x[1]).toBeCloseTo(0.5);
  });
});

describe('daily closes', () => {
  it('drops token-price spikes and days before a rebase, oldest first', () => {
    const c = closes(hist([[5, 1000], [4, 1010], [3, 2_000_000], [2, 2_050_000], [1, 0.01], [0, 2_100_000]]));
    expect(c.map((p) => p.value)).toEqual([2_000_000, 2_050_000, 2_100_000]);
  });
  it('change since a date and the last days', () => {
    const c = closes(hist([[3, 100, 5], [2, 110], [1, 120], [0, 90]]));
    expect(changeSince(c)!.change).toBeCloseTo(-10);
    expect(changeSince(c, NOW - 1.5 * DAY)!.change).toBeCloseTo(-25);
    expect(changeSince(c.slice(0, 1))).toBeUndefined();
    expect(lastDays(c, 2, NOW).length).toBe(3);
    expect(c[0].volume).toBe(5);
  });
  it('index bars: best first, with members and ETFs', () => {
    const bars = indexBars(
      [
        { asin: 'I1', name: 'Eins' },
        { asin: 'I2', name: 'Zwei' },
        { asin: 'I3', name: 'Ohne Verlauf' },
      ],
      { I1: hist([[2, 100], [0, 90]]), I2: hist([[2, 100], [0, 150]]) },
      new Map([['I1', 12]]),
      new Map([['I2', ['Zwei ETF']]]),
    );
    expect(bars.map((b) => [b.asin, Math.round(b.change), b.members, b.etfs])).toEqual([
      ['I2', 50, null, ['Zwei ETF']],
      ['I1', -10, 12, []],
    ]);
    const f = fig(indexChart(theme, 800, bars));
    expect(f.data[0].marker.color).toEqual(['loss', 'gain']);
  });
  it('the index chart cuts a far outlier but keeps its value in the label', () => {
    const f = fig(indexChart(theme, 800, [
      { asin: 'A', name: 'A', change: 9789, days: 3, members: 1, etfs: [] },
      { asin: 'B', name: 'B', change: 100, days: 3, members: 1, etfs: [] },
    ]));
    expect(Math.max(...f.data[0].x)).toBe(150);
    expect(f.layout.annotations.some((a: { text: string }) => a.text.includes('9.789'))).toBe(true);
  });
  it('ETF against its index over the same days', () => {
    const p = etfPair(
      { asin: 'EF1', name: 'ETF', baseIndexAsin: 'ID1', baseIndexName: 'Index', managementFeePercent: 1 },
      { EF1: hist([[2, 50], [1, 55], [0, 60]]), ID1: hist([[5, 80], [2, 100], [1, 105], [0, 110]]) },
    )!;
    expect(p.etf).toBeCloseTo(20);
    expect(p.index).toBeCloseTo(10);
    expect(p.gap).toBeCloseTo(10);
    expect(p.days).toBe(2);
    expect(etfPair({ asin: 'X', name: 'X' }, {})).toBeUndefined();
    const f = fig(etfChart(theme, 800, [p]));
    expect(f.layout.annotations[0].text).toContain('+10,0');
  });
  it('the coin chart: one coin = price line over volume bars without bar text', () => {
    const f = fig(coinChart(theme, 800, [{ asin: 'AC', name: 'Coin', points: closes(hist([[2, 100, 7], [1, 90, 8], [0, 95, 9]])) }]));
    expect(f.data[0].line.color).toBe('loss');
    expect(f.data[1].textposition).toBe('none');
    const two = fig(coinChart(theme, 800, [
      { asin: 'A', name: 'A', points: closes(hist([[1, 10], [0, 20]])) },
      { asin: 'B', name: 'B', points: closes(hist([[1, 10], [0, 5]])) },
    ]));
    expect(two.data.map((d) => d.y[1])).toEqual([200, 50]);
  });
});

describe('several classes', () => {
  it('counts per class in filter order; bonds have neither change nor volume', () => {
    const rows = [
      row('B1', { group: 'BOND', type: 'BOND' }),
      row('S1', { volume: 10, change: 2 }),
      row('S2', { volume: 0, change: -1 }),
      row('C1', { group: 'COIN', type: 'COIN', volume: 5, change: 0 }),
    ];
    const c = classRows(rows);
    expect(c.map((x) => [x.group, x.count, x.traded, x.up, x.down, x.volume, x.hasChange, x.volumeKnown])).toEqual([
      ['STOCK', 2, 1, 1, 1, 10, true, true],
      ['BOND', 1, 0, 0, 0, 0, false, false],
      ['COIN', 1, 1, 0, 0, 5, true, true],
    ]);
    const f = fig(classChart(theme, 800, c));
    expect(f.data[0].x).toEqual([-0, -0, -1]);
    expect(f.layout.annotations.some((a: { text: string }) => a.text === 'Umsatz nicht erfasst')).toBe(true);
  });
});
