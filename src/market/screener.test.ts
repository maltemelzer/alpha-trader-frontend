import { describe, expect, it } from 'vitest';
import type { MarketRow } from '../api/queries';
import type { BondView } from '../../design-system/components';
import {
  activePreset,
  applyScreen,
  bookPerShare,
  changeLookup,
  companyFacts,
  chips,
  coverageLookup,
  defaultColumns,
  filterCount,
  histogram,
  inRange,
  issuerIds,
  formatRange,
  fromBonds,
  fromCompanies,
  fromMarketRow,
  fromPositions,
  groupOf,
  lookup,
  marketMap,
  mergeRows,
  parseRange,
  PRESETS,
  presetChanges,
  presetsFor,
  rangeValue,
  rangeText,
  readScreen,
  sortRows,
  toggleType,
  visibleColumns,
  type ScreenRow,
} from './screener';

const NOW = 1_790_000_000_000;
const DAY = 86_400_000;

const mrow = (asin: string, type: string, o: Partial<MarketRow> = {}): MarketRow => ({
  listing: { securityIdentifier: asin, name: `Name ${asin}`, type },
  ...o,
});
const row = (asin: string, type: string, o: Partial<MarketRow> = {}) => fromMarketRow(mrow(asin, type, o))!;
const screen = (q: string) => readScreen(new URLSearchParams(q));

describe('parseRange / formatRange', () => {
  it('reads both ends, one end and negative numbers', () => {
    expect(parseRange('10..50')).toEqual({ min: 10, max: 50 });
    expect(parseRange('10..')).toEqual({ min: 10, max: undefined });
    expect(parseRange('..0.5')).toEqual({ min: undefined, max: 0.5 });
    expect(parseRange('-5..-1')).toEqual({ min: -5, max: -1 });
    expect(parseRange('0.0417..')).toEqual({ min: 0.0417, max: undefined });
  });
  it('ignores empty and broken values', () => {
    expect(parseRange('..')).toBeUndefined();
    expect(parseRange('abc')).toBeUndefined();
    expect(parseRange(null)).toBeUndefined();
  });
  it('writes the compact form back', () => {
    expect(formatRange({ min: 1.5 })).toBe('1.5..');
    expect(formatRange({ max: -2 })).toBe('..-2');
    expect(formatRange({})).toBeNull();
  });
});

describe('readScreen', () => {
  it('defaults to shares, „alle“ means every type', () => {
    expect(screen('').types).toEqual(['STOCK']);
    expect(screen('art=alle').types).toEqual([]);
    expect(screen('art=BOND,COIN,unknown').types).toEqual(['BOND', 'COIN']);
    expect(screen('art=SYSTEM_BOND').types).toEqual(['BOND']);
  });
  it('reads sort with direction, columns and building sizes', () => {
    const s = screen('sort=-ums&sp=ver,kurs,xx&gr=150,1200&mit=beide&kurs=..10');
    expect(s.sort).toEqual({ key: 'ums', dir: 'desc' });
    expect(s.cols).toEqual(['ver', 'kurs']);
    expect(s.sizes).toEqual([150, 1200]);
    expect(s.quote).toBe('beide');
    expect(s.ranges.kurs).toEqual({ min: undefined, max: 10 });
    expect(screen('sort=bogus').sort).toBeNull();
  });
});

describe('types and columns', () => {
  it('groups system bonds with bonds, system repos with repos', () => {
    expect(groupOf('INTEREST_TENDER_BOND')).toBe('BOND');
    expect(groupOf('SYSTEM_REPO')).toBe('REPO');
    expect(groupOf('OTHER')).toBeNull();
  });
  it('warrants are chosen alone', () => {
    expect(toggleType(['STOCK'], 'WARRANT')).toEqual(['WARRANT']);
    expect(toggleType(['WARRANT'], 'COIN')).toEqual(['COIN']);
    expect(toggleType(['WARRANT'], 'WARRANT')).toEqual([]);
  });
  it('toggles types; from „all“ a click picks one', () => {
    expect(toggleType([], 'COIN')).toEqual(['COIN']);
    expect(toggleType(['COIN'], 'STOCK')).toEqual(['STOCK', 'COIN']);
    expect(toggleType(['STOCK', 'COIN'], 'STOCK')).toEqual(['COIN']);
  });
  it('bonds and buildings get their own default columns; chosen columns keep table order', () => {
    expect(defaultColumns(['BOND'])).toContain('rt');
    expect(defaultColumns(['BUILDING'])).toContain('qm');
    expect(defaultColumns([])).toContain('ums');
    expect(visibleColumns(screen('sp=ums,kurs'))).toEqual(['kurs', 'ums']);
  });
});

describe('rows from sources', () => {
  it('computes the spread only with both sides and the price per m² of buildings', () => {
    const r = row('ST1', 'STOCK', { bidPrice: 9, askPrice: 10, lastPrice: { value: 9.5, date: 0 } });
    expect(r.spread).toBeCloseTo(10);
    expect(r.last).toBe(9.5);
    expect(row('ST2', 'STOCK', { askPrice: 10 }).spread).toBeNull();
    const b = fromMarketRow({ listing: { securityIdentifier: 'BD1', name: 'Building 1200 20/09/2026', type: 'BUILDING' }, askPrice: 1_200_000 })!;
    expect(b.size).toBe(1200);
    expect(b.perSqm).toBe(1000);
    expect(b.name).toBe('Gebäude 1200 (20.09.)');
    expect(b.rawName).toContain('Building');
  });
  it('turns running bonds into rows with yield per day, repos without prices', () => {
    const bond = {
      id: 'b',
      listing: { securityIdentifier: 'BO1', name: 'X 2%', type: 'BOND' },
      repurchaseListing: { securityIdentifier: 'RE1', name: 'X 2%', type: 'REPO' },
      issuer: { name: 'Flora Corp.', securityIdentifier: 'STF' },
      interestRate: 2,
      faceValue: 100,
      volume: 1000,
      maturityDate: NOW + 2 * DAY,
      priceSpread: { askPrice: 100, askSize: 5 },
    } as BondView;
    const expired = { ...bond, maturityDate: NOW - 1 } as BondView;
    const [b] = fromBonds([bond, expired], NOW);
    expect(b.group).toBe('BOND');
    expect(b.yieldPerDay).toBeCloseTo(1);
    expect(b.issuer).toBe('Flora Corp.');
    const [r] = fromBonds([bond], NOW, true);
    expect(r.asin).toBe('RE1');
    expect(r.ask).toBeNull();
    expect(r.rate).toBe(2);
    expect(b.face).toBe(1000);
    // bond prices are % of the face value 100: 5 bonds at 100 % = 500 €
    expect(b.askValue).toBe(500);
  });
  it('merges lists, fills gaps from later lists and adds lookups; complete lookups mean 0', () => {
    const rows = mergeRows([[row('ST1', 'STOCK')], [row('ST1', 'STOCK', { askPrice: 5 }), row('ST2', 'STOCK')]], {
      volume: lookup([['ST1', 100]], true),
      trades: lookup([['ST1', 3]], false),
      change: changeLookup([mrow('ST1', 'STOCK', { priceChangeInPercent: 4 }), mrow('X', 'STOCK', { priceChangeInPercent: 0 })], []),
    });
    const [a, b] = rows;
    expect(a.ask).toBe(5);
    expect(a.volume).toBe(100);
    expect(b.volume).toBe(0);
    expect(b.trades).toBeNull();
    expect(a.change).toBe(4);
    expect(b.change).toBe(0);
  });
  it('gives every bond of an issuer the coverage of all its running bonds', () => {
    const bond = (asin: string, issuerId?: string) =>
      ({
        id: asin,
        listing: { securityIdentifier: asin, name: asin, type: asin.startsWith('SB') ? 'SYSTEM_BOND' : 'BOND' },
        issuer: issuerId ? { name: 'Flora Corp.', id: issuerId } : undefined,
        interestRate: 0,
        faceValue: 100,
        volume: 100,
        maturityDate: NOW + DAY,
      }) as BondView;
    const bonds = fromBonds([bond('BO1', 'c1'), bond('BO2', 'c1'), bond('BO3', 'c2'), bond('SB1')], NOW);
    expect(issuerIds(bonds)).toEqual(['c1', 'c2']);
    const cov = coverageLookup(
      {
        // two running bonds of 100 € each (one matured already): 300 € net cash = 150 %
        c1: {
          id: 'c1',
          companyCapabilities: { netCash: 300 },
          issuedBonds: [
            { volume: 100, interestRate: 0, maturityDate: NOW + DAY },
            { volume: 100, interestRate: 0, maturityDate: NOW + DAY },
            { volume: 5_000, interestRate: 0, maturityDate: NOW - 1 },
          ],
        },
        c2: { id: 'c2', companyCapabilities: {}, issuedBonds: [{ volume: 100, maturityDate: NOW + DAY }] },
      },
      NOW,
    );
    const rows = mergeRows([bonds], { coverage: cov });
    expect(rows.map((r) => r.coverage)).toEqual([150, 150, null, null]);
    expect(coverageLookup(undefined, NOW)).toBeNull();
  });
  it('a complete turnover list says nothing about bonds, indexes and ETFs (it never lists them)', () => {
    const rows = mergeRows([[row('EF1', 'ETF'), row('ID1', 'INDEX'), row('BD1', 'BUILDING')]], { volume: lookup([['ST1', 100]], true) });
    expect(rows.map((r) => r.volume)).toEqual([null, null, 0]);
  });
  it('a movers list that does not reach 0 leaves others unknown', () => {
    const l = changeLookup([mrow('A', 'STOCK', { priceChangeInPercent: 5 })], [mrow('B', 'STOCK', { priceChangeInPercent: -1 })])!;
    expect(l.complete).toBe(false);
  });
  it('treats jumps beyond ×10 after a token-price transfer as unknown, not as a move', () => {
    const l = changeLookup(
      [mrow('SPIKE', 'STOCK', { priceChangeInPercent: 479450 }), mrow('UP', 'STOCK', { priceChangeInPercent: 150 }), mrow('Z', 'STOCK', { priceChangeInPercent: 0 })],
      [mrow('CRASH', 'STOCK', { priceChangeInPercent: -99.9 }), mrow('Z2', 'STOCK', { priceChangeInPercent: 0 })],
    );
    const rows = mergeRows([[row('SPIKE', 'STOCK'), row('UP', 'STOCK'), row('CRASH', 'STOCK'), row('OTHER', 'STOCK')]], { change: l });
    expect(rows.map((r) => r.change)).toEqual([null, 150, null, 0]);
  });
});

describe('applyScreen / sortRows', () => {
  const now = NOW;
  const rows: ScreenRow[] = [
    { ...row('ST1', 'STOCK', { bidPrice: 9, bidSize: 1, askPrice: 10, askSize: 1, lastPrice: { value: 10, date: 0 } }), volume: 500, change: 5 },
    { ...row('ST2', 'STOCK', { askPrice: 100, askSize: 2, lastPrice: { value: 100, date: 0 } }), volume: 0, change: -3 },
    { ...row('CO1', 'COIN', { lastPrice: { value: 1, date: 0 } }), volume: null, change: null },
    ...fromBonds(
      [
        {
          id: 'b',
          listing: { securityIdentifier: 'BO1', name: 'Bond', type: 'BOND' },
          issuer: { name: 'Flora Corp.' },
          interestRate: 3,
          faceValue: 100,
          volume: 1,
          maturityDate: now + 3 * DAY,
          priceSpread: { askPrice: 99, askSize: 1 },
        } as BondView,
      ],
      now,
    ),
  ];
  const ids = (q: string) => applyScreen(rows, screen(q), now).map((r) => r.asin);

  it('filters by types, price range and quote side', () => {
    expect(ids('art=alle&kurs=5..50')).toEqual(['ST1']);
    expect(ids('art=STOCK&mit=beide')).toEqual(['ST1']);
    expect(ids('art=STOCK,COIN&mit=brief')).toEqual(['ST1', 'ST2']);
  });
  it('unknown values fail a range, bond ranges leave shares alone', () => {
    expect(ids('art=alle&ums=1..')).toEqual(['ST1']);
    expect(ids('art=STOCK,BOND&lz=..2')).toEqual(['ST1', 'ST2']);
    expect(ids('art=STOCK,BOND&deck=100..')).toEqual(['ST1', 'ST2']);
    expect(ids('art=STOCK,BOND&lz=2..4')).toEqual(['ST1', 'ST2', 'BO1']);
    expect(ids('art=BOND&em=flora')).toEqual(['BO1']);
    expect(ids('art=BOND&em=other')).toEqual([]);
  });
  it('searches name, ASIN and issuer', () => {
    expect(ids('art=alle&q=co1')).toEqual(['CO1']);
    expect(ids('art=alle&q=Flora')).toEqual(['BO1']);
  });
  it('sorts with unknown values last in both directions', () => {
    expect(sortRows(rows, { key: 'ver', dir: 'desc' }).map((r) => r.asin)).toEqual(['ST1', 'ST2', 'CO1', 'BO1']);
    expect(sortRows(rows, { key: 'ver', dir: 'asc' }).map((r) => r.asin)).toEqual(['ST2', 'ST1', 'CO1', 'BO1']);
  });
});

describe('chips and presets', () => {
  it('labels ranges in German with units and a real minus', () => {
    expect(rangeText('ver', { min: -5 })).toBe('Veränd. ≥ −5\u00a0%');
    expect(rangeText('kurs', { min: 10, max: 50 })).toBe('Kurs 10–50\u00a0€');
    expect(rangeText('ums', { min: 2_500_000 })).toBe('Umsatz ≥ 2,5\u00a0Mio.\u00a0€');
  });
  it('lists every active filter once', () => {
    const c = chips(screen('mit=brief&spr=..2&em=Flora&gr=150'));
    expect(c.map((x) => x.key)).toEqual(['mit', 'spr', 'em', 'gr']);
  });
  it('a preset clears other filters and is recognised again', () => {
    const p = PRESETS.find((x) => x.id === 'gewinner')!;
    const ch = presetChanges(p);
    expect(ch.kurs).toBeNull();
    expect(ch.sort).toBe('-ver');
    const params = new URLSearchParams(p.params);
    params.set('q', 'alpha');
    expect(activePreset(params)?.id).toBe('gewinner');
    params.set('kurs', '1..');
    expect(activePreset(params)).toBeUndefined();
  });
  it('counts filters for the badge', () => {
    expect(filterCount(screen('art=alle&mit=beide&ums=1..'))).toBe(2);
    expect(filterCount(screen(''))).toBe(0);
  });
});

describe('histogram', () => {
  it('bins on a log scale and ignores values ≤ 0 there', () => {
    const h = histogram([1, 10, 100, 1000, 0, -5], { log: true }, 3);
    expect(h.map((b) => b.count)).toEqual([1, 1, 2]);
    expect(h[0].from).toBeCloseTo(1);
    expect(h[2].to).toBeCloseTo(1000);
  });
  it('clips linear bins at lo/hi', () => {
    const h = histogram([-100, -10, 0, 10, 100], { lo: -30, hi: 30 }, 3);
    expect(h.map((b) => b.count)).toEqual([1, 2, 2]);
  });
  it('needs two values; marks bins inside a range', () => {
    expect(histogram([5], {})).toEqual([]);
    expect(inRange({ from: 0, to: 10, count: 1 }, { min: 5 })).toBe(true);
    expect(inRange({ from: 0, to: 10, count: 1 }, { min: 10 })).toBe(false);
    expect(inRange({ from: 0, to: 10, count: 1 }, undefined)).toBe(false);
  });
});

describe('marketMap', () => {
  const r = (asin: string, type: string, volume: number, name = asin) => ({ ...fromMarketRow({ listing: { securityIdentifier: asin, name, type } })!, volume });
  it('groups by type, buildings by size, and leaves out untraded rows', () => {
    const nodes = marketMap(
      [r('ST1', 'STOCK', 100), r('ST2', 'STOCK', 0), r('BD1', 'BUILDING', 16, 'Building 150 01/10/2026'), r('AC1', 'COIN', 10_000)],
      (v) => v,
    );
    expect(nodes.filter((n) => !n.asin).map((n) => [n.id, n.parent])).toEqual([
      ['g:COIN', ''],
      ['g:STOCK', ''],
      ['g:BUILDING', ''],
      ['g:BUILDING:150', 'g:BUILDING'],
    ]);
    expect(nodes.find((n) => n.asin === 'BD1')!.parent).toBe('g:BUILDING:150');
    expect(nodes.some((n) => n.asin === 'ST2')).toBe(false);
  });
  it('splits the area level by level, so many small tiles do not outweigh one big group', () => {
    const many = Array.from({ length: 100 }, (_, i) => r(`BD${i}`, 'BUILDING', 1, 'Building 150 01/10/2026'));
    const nodes = marketMap([r('ST1', 'STOCK', 10_000), ...many], (v) => Math.sqrt(v));
    const sum = (p: (n: (typeof nodes)[number]) => boolean) => nodes.filter(p).reduce((a, n) => a + n.area, 0);
    const stock = sum((n) => n.asin === 'ST1');
    const buildings = sum((n) => n.asin.startsWith('BD'));
    // group areas 100 : 10 (square root of 10.000 and of 100)
    expect(stock / buildings).toBeCloseTo(10);
  });
});

describe('activity and depth', () => {
  it('reads listing start, last trade and the € at the best quotes', () => {
    const r = row('ST1', 'STOCK', {
      listing: { securityIdentifier: 'ST1', name: 'A', type: 'STOCK', startDate: NOW - 3 * DAY },
      lastPrice: { value: 2, date: NOW - 2 * 3_600_000 },
      askPrice: 2.5,
      askSize: 100,
      bidPrice: 2,
      bidSize: 0,
    });
    expect(rangeValue('alt', r, NOW)).toBeCloseTo(3);
    expect(rangeValue('zul', r, NOW)).toBeCloseTo(2);
    expect(r.askValue).toBe(250);
    expect(r.bidValue).toBeNull();
    const s = readScreen(new URLSearchParams('art=STOCK&alt=..7&zul=..1'));
    expect(applyScreen([r], s, NOW)).toHaveLength(0);
    expect(applyScreen([r], readScreen(new URLSearchParams('art=STOCK&alt=..7&tb=100..')), NOW)).toHaveLength(1);
  });
});

describe('company figures', () => {
  it('takes the reserves out of the fair value per share', () => {
    // Argo (checked against historizedcompanydata): book value per share 2,8667 · 10¹⁰
    expect(bookPerShare(187161989232.98, 1433383354355586.5, 7924716107292928)).toBeCloseTo(28667667087.11, -3);
    expect(bookPerShare(20, 1000)).toBe(20);
    expect(bookPerShare(0, 1000)).toBeUndefined();
  });
  it('fills KBV, net cash, CEO and policy of shares; later lists fill gaps', () => {
    const facts = companyFacts(
      [
        [{ securityIdentifier: 'ST1', bookValue: 1000, netCash: 50, fairValuePerShare: 4, marketMakerPolicy: 'OPEN' }],
        [{ securityIdentifier: 'ST1', ceo: { username: 'Malte' } }],
      ],
      new Map(),
    );
    const rows = mergeRows([[row('ST1', 'STOCK', { lastPrice: { value: 2, date: NOW } }), row('BO1', 'BOND')]], { company: facts, held: new Set(['BO1']) });
    const st = rows.find((r) => r.asin === 'ST1')!;
    expect(st.kbv).toBe(0.5);
    expect(st.netCash).toBe(50);
    expect(st.ceo).toBe('Malte');
    expect(st.mm).toBe('OPEN');
    expect(st.held).toBe(false);
    expect(rows.find((r) => r.asin === 'BO1')!.held).toBe(true);
  });
  it('filters by CEO (any case, shares only), policy and KBV (other types stay)', () => {
    const facts = companyFacts([[{ securityIdentifier: 'ST1', fairValuePerShare: 4, marketMakerPolicy: 'CLOSED', ceo: { username: 'Malte' } }]]);
    const rows = mergeRows([[row('ST1', 'STOCK', { lastPrice: { value: 2, date: NOW } }), row('ST2', 'STOCK'), row('AC1', 'COIN')]], { company: facts });
    const pick = (q: string) => applyScreen(rows, readScreen(new URLSearchParams(q)), NOW).map((r) => r.asin);
    expect(pick('art=alle&ceo=malte')).toEqual(['ST1']);
    expect(pick('art=alle&mm=zu')).toEqual(['ST1', 'AC1']);
    expect(pick('art=alle&mm=offen')).toEqual(['AC1']);
    expect(pick('art=STOCK&kbv=..1')).toEqual(['ST1']);
  });
  it('filters by depot only once it is known', () => {
    const rows = mergeRows([[row('ST1', 'STOCK'), row('ST2', 'STOCK')]], { held: new Set(['ST2']) });
    expect(applyScreen(rows, readScreen(new URLSearchParams('depot=ja')), NOW).map((r) => r.asin)).toEqual(['ST2']);
    expect(applyScreen(rows, readScreen(new URLSearchParams('depot=nein')), NOW).map((r) => r.asin)).toEqual(['ST1']);
    const unknown = mergeRows([[row('ST1', 'STOCK')]], {});
    expect(applyScreen(unknown, readScreen(new URLSearchParams('depot=ja')), NOW)).toHaveLength(0);
  });
});

describe('extra sources', () => {
  it('turns depot positions and CEO companies into rows', () => {
    const [p] = fromPositions([{ securityIdentifier: 'ST9', listing: { name: 'Neun', type: 'STOCK' }, lastPrice: { value: 3, date: NOW }, currentBidPrice: 2.9 }]);
    expect([p.asin, p.last, p.bid, p.lastTrade]).toEqual(['ST9', 3, 2.9, NOW]);
    const rows = fromCompanies([{ listing: { name: 'Acht', securityIdentifier: 'ST8', type: 'STOCK' } }, {}], { ST8: { askPrice: 4, askSize: 10 } });
    expect(rows.map((r) => [r.asin, r.ask, r.askValue])).toEqual([['ST8', 4, 40]]);
  });
});

describe('new filters in the URL', () => {
  it('reads CEOs, policy and depot and shows them as chips', () => {
    const s = readScreen(new URLSearchParams('ceo=Malte, Kuschelchen,Malte&mm=offen&depot=nein&kbv=..1'));
    expect(s.ceos).toEqual(['Malte', 'Kuschelchen']);
    expect(chips(s).map((c) => c.label)).toEqual(['KBV ≤ 1', 'CEO: Malte, Kuschelchen', 'Market Maker erlaubt', 'Nicht im Depot']);
    expect(readScreen(new URLSearchParams('mm=x&depot=y')).mm).toBe('');
  });
  it('adds „Meine Unternehmen“ after „Mein Depot“ and recognises it', () => {
    const list = presetsFor('Malte');
    expect(list.length).toBe(PRESETS.length + 1);
    const mine = list.find((p) => p.id === 'meine')!;
    expect(list[list.findIndex((p) => p.id === 'depot') + 1]).toBe(mine);
    const url = new URLSearchParams(Object.entries(presetChanges(mine)).filter(([, v]) => v) as [string, string][]);
    expect(activePreset(url, list)?.id).toBe('meine');
    expect(presetsFor(undefined)).toBe(PRESETS);
  });
});
