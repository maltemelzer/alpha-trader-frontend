import { describe, expect, it } from 'vitest';
import type { MarketRow } from '../../api/queries';
import type { SecurityOrderLogEntryView } from '../../api/types';
import { lookup } from '../../market/screener';
import {
  bestYields,
  bigTrades,
  biggestMoves,
  boardChange,
  boardLeft,
  boardPrice,
  bondIssuer,
  cells,
  changedCells,
  changeOf,
  countdown,
  depotChange,
  fitPrice,
  flapSequence,
  shortPrice,
  linesFor,
  mostTraded,
  paginate,
  tickerOrder,
  flipDelay,
  lastTrades,
  nameCells,
  newsRows,
  boardTime,
  boardName,
  cellsIn,
  type BoardRow,
  type BoardSection,
  type TickerItem,
} from './derive';

const NBSP = String.fromCharCode(0xa0);
const trade = (asin: string, price: number, date: number, volume = price): SecurityOrderLogEntryView =>
  ({ id: `${asin}-${date}`, securityIdentifier: asin, price, date, numberOfShares: 1, volume }) as SecurityOrderLogEntryView;
const ctx = { changes: null, mine: new Set<string>() };

describe('cells', () => {
  it('pads, upper-cases and cuts to the width', () => {
    expect(cells('Fortune', 10)).toBe('FORTUNE   ');
    expect(cells('12,50', 8, 'right')).toBe('   12,50');
    expect(cells('Prime Reserve Bank', 10)).toBe('PRIME RES.');
    expect(cells(`1,2${NBSP}Mio.`, 9, 'right')).toBe(' 1,2 MIO.');
    expect(cells('Straße', 6)).toBe('STRASSE'.slice(0, 5) + '.');
  });
});

describe('number formats', () => {
  it('formats prices, changes and times for the board', () => {
    expect(boardPrice(62.456)).toBe('62,46');
    expect(boardPrice(0.0042)).toBe('0,0042');
    expect(boardPrice(155_817_900)).toBe(`156${NBSP}Mio.`);
    expect(boardPrice(null)).toBe('–');
    expect(shortPrice(508_489.47)).toBe(`508${NBSP}Tsd.`);
    expect(fitPrice({ price: '508.489,47', priceShort: '508 Tsd.' }, 9)).toBe('508 Tsd.');
    expect(fitPrice({ price: '62,46', priceShort: '62,46' }, 9)).toBe('62,46');
    expect(boardChange(24.314)).toBe('+24,31');
    expect(boardChange(-0.4)).toBe('−0,40');
    expect(boardChange(4795.2)).toBe('+4.795');
    expect(boardChange(0.001)).toBe('0,00');
    expect(boardChange(null)).toBe('–');
    expect(boardLeft(2 * 86_400_000 + 4 * 3_600_000 + 13 * 60_000)).toBe('2T 04:13');
    expect(boardLeft(90 * 60_000)).toBe('01:30');
    expect(countdown(2 * 3_600_000 + 13 * 60_000 + 45_500)).toBe('02:13:45');
    expect(countdown(-5)).toBe('00:00:00');
  });
});

describe('flapSequence', () => {
  it('turns through at most one calm character and ends with the new one', () => {
    const s = flapSequence('A', '9');
    expect(s).toHaveLength(2);
    expect(s[1]).toBe('9');
    expect(s[0]).toMatch(/^[A-Z0-9]$/);
    expect(flapSequence('A', 'A')).toEqual([]);
    expect(flapSequence('A', 'B', 1)).toEqual(['B']);
  });
  it('never shows punctuation on the way', () => {
    for (const [a, b] of [[' ', '%'], ['€', ','], ['?', 'X'], ['Z', ':']]) {
      const s = flapSequence(a, b, 4);
      expect(s[s.length - 1]).toBe(b);
      for (const c of s.slice(0, -1)) expect(c).toMatch(/^[A-Z0-9]$/);
    }
  });
  it('marks changed cells', () => {
    expect(changedCells('12,50', '12,55')).toEqual([false, false, false, false, true]);
  });
  it('keeps the whole board within the cap', () => {
    expect(flipDelay(0, 0)).toBe(0);
    expect(flipDelay(2, 3)).toBe(108);
    expect(flipDelay(30, 60)).toBe(600);
  });
});

describe('cells and times', () => {
  it('keeps a suffix readable', () => {
    expect(nameCells('Malljens282741 Co.', '×84', 12)).toBe('MALLJEN. ×84');
    expect(nameCells('zFloat Vault 017', '', 14)).toBe('ZFLOAT V.017  ');
  });
  it('keeps what tells names apart', () => {
    expect(boardName('zFloat Vault 017', 12)).toBe('zFloat V.017');
    expect(boardName('zFloat Vault 006', 12)).not.toBe(boardName('zFloat Vault 017', 12));
    expect(boardName('Prime Reserve Bank Inc.', 20)).toBe('Prime Reserve Bank');
    expect(boardName('Seylor Tender Bank AG', 14)).toBe('Seylor Tender Bank');
    expect(boardName('Building 1200 Street 42', 16)).toBe('Building 1. S.42');
    expect(boardName('Extraordinarily Long 42', 8)).toBe('Extr. 42');
    expect(boardName('AG', 5)).toBe('AG');
    expect(nameCells('Fortune', '', 9)).toBe('FORTUNE  ');
    expect(cellsIn(100, 12, 3)).toBe(8);
    expect(cellsIn(10, 12, 3)).toBe(3);
  });
  it('writes the time of today, else the date', () => {
    const now = new Date(2026, 8, 30, 18, 0).getTime();
    expect(boardTime(new Date(2026, 8, 30, 9, 5).getTime(), now)).toBe('09:05');
    expect(boardTime(new Date(2026, 8, 29, 9, 5).getTime(), now)).toBe('29.09');
    expect(boardTime(new Date(2026, 9, 14, 9, 5).getTime(), now)).toBe('14.10▸');
    expect(boardTime(new Date(2026, 8, 30, 19, 30).getTime(), now)).toBe('19:30▸');
  });
});

describe('changeOf', () => {
  it('knows listed moves, 0 when complete, else unknown', () => {
    expect(changeOf('A', lookup([['A', 3]], false))).toBe(3);
    expect(changeOf('B', lookup([['A', 3]], false))).toBeNull();
    expect(changeOf('B', lookup([['A', 3]], true))).toBe(0);
    expect(changeOf('C', lookup([['C', NaN]], true))).toBeNull();
    expect(changeOf('A', null)).toBeNull();
  });
});

describe('lastTrades', () => {
  it('keeps the newest trade per security after the opening, with its move', () => {
    const t = [trade('X', 10, 1), trade('X', 11, 20), trade('X', 10.5, 30), trade('Y', 1, 5), trade('Z', 0.01, 40)];
    const m = lastTrades(t, 10);
    expect(m.get('X')).toEqual({ id: 'X-30', dir: 'down' });
    expect(m.has('Y')).toBe(false);
    expect(m.has('Z')).toBe(false);
  });
});

describe('rows', () => {
  it('lists the most traded shares and the coin by volume', () => {
    const rows = mostTraded(
      [
        { securityIdentifier: 'STA', name: 'A', lastPrice: 2, previousPrice: 2, volume24h: 10 },
        { securityIdentifier: 'BDX', name: 'Haus', lastPrice: 2, previousPrice: 2, volume24h: 100 },
        { securityIdentifier: 'ACALPHCOIN', name: 'AlphaCoins', lastPrice: 18500, previousPrice: 18500, volume24h: 50 },
      ],
      { ...ctx, mine: new Set(['STA']) },
    );
    expect(rows.map((r) => r.asin)).toEqual(['ACALPHCOIN', 'STA']);
    expect(rows[1].mine).toBe(true);
  });

  it('picks the biggest moves with a market, without spikes and without rows shown already', () => {
    const r = (asin: string, pct: number, quote = true): MarketRow => ({
      listing: { name: asin, securityIdentifier: asin, type: 'STOCK' },
      priceChangeInPercent: pct,
      bidPrice: quote ? 1 : null,
      askPrice: quote ? 1 : null,
      lastPrice: { value: 1, date: 0 },
    });
    const rows = biggestMoves(
      [r('STA', 5), r('STB', 2000), r('STC', 30, false), r('STD', 8)],
      [r('STE', -12), r('STF', -3)],
      [{ securityIdentifier: 'STD', volume24h: 5 }],
      ctx,
      new Set(['STF']),
    );
    expect(rows.map((x) => x.asin)).toEqual(['STE', 'STA']);
    expect(rows[0].dir).toBe('down');
  });

  it('folds bond cohorts into one line with the best yield per day first', () => {
    const now = 0;
    const bond = (asin: string, ask: number, rate: number, maturity: number) => ({
      listing: { securityIdentifier: asin, name: `Corp ${rate}% x` },
      issuer: { name: 'Corp' },
      interestRate: rate,
      maturityDate: maturity,
      priceSpread: { askPrice: ask },
    });
    const day = 86_400_000;
    const rows = bestYields(
      [bond('B1', 100, 2, day), bond('B2', 100, 2, day), bond('B3', 100, 1, day), bond('B4', 100, 5, 30 * 60_000), { ...bond('B5', 100, 9, day), priceSpread: { askPrice: null } }],
      now,
      new Set(['B2']),
    );
    expect(rows.map((x) => x.asin)).toEqual(['B1', 'B3']);
    expect(rows[0].suffix).toBe('×2');
    expect(rows[0].mine).toBe(true);
    expect(rows[0].change).toBe('2,00');
    expect(rows[0].volume).toBe('1T 00:00');
  });

  it('takes the issuer out of a bond name', () => {
    expect(bondIssuer('datOlen195858 Corp. 2.0600% 30/09/2026')).toBe('datOlen195858 Corp.');
  });
});

describe('paginate', () => {
  const row = (i: number): BoardRow => ({ asin: `S${i}`, name: '', price: '', priceShort: '', dir: null, change: '', volume: '', mine: false });
  const section = (id: BoardSection['id'], n: number): BoardSection => ({ id, title: id, heads: ['', '', ''], rows: Array.from({ length: n }, (_, i) => row(i)), empty: '' });

  it('keeps everything on one page when it fits', () => {
    const pages = paginate([section('handel', 3), section('bewegung', 2)], 7);
    expect(pages).toHaveLength(1);
    expect(pages[0].map((l) => l.kind)).toEqual(['head', 'row', 'row', 'row', 'head', 'row', 'row']);
  });

  it('repeats the head on the next page and never leaves a head alone', () => {
    const pages = paginate([section('handel', 4), section('bewegung', 3)], 5);
    expect(pages.map((p) => p.map((l) => l.kind))).toEqual([
      ['head', 'row', 'row', 'row', 'row'],
      ['head', 'row', 'row', 'row'],
    ]);
    const orphan = paginate([section('handel', 3), section('bewegung', 2)], 5);
    expect(orphan[0].map((l) => l.kind)).toEqual(['head', 'row', 'row', 'row']);
    expect(orphan[1][0]).toMatchObject({ kind: 'head', cont: false });
  });

  it('marks continued heads and gives an empty section a note line', () => {
    const pages = paginate([section('handel', 6)], 4);
    expect(pages[1][0]).toMatchObject({ kind: 'head', cont: true });
    expect(paginate([section('depot', 0)], 4)[0].map((l) => l.kind)).toEqual(['head', 'note']);
  });

  it('counts lines for a height', () => {
    expect(linesFor(300, 28)).toBe(10);
    expect(linesFor(20, 28)).toBe(3);
  });
});

describe('depotChange', () => {
  it('takes each position back by its change', () => {
    const d = depotChange(
      { cash: 100, positions: [{ securityIdentifier: 'A', volume: 110 }, { securityIdentifier: 'B', volume: 50 }] },
      lookup([['A', 10]], false),
    );
    expect(d?.value).toBe(260);
    expect(d?.change).toBeCloseTo(10);
    expect(d?.pct).toBeCloseTo(4);
    expect(d?.unknown).toBe(1);
    expect(depotChange(undefined, null)).toBeNull();
  });
});

describe('ticker', () => {
  it('puts unread messages first, then the newest articles, the rest newest first', () => {
    const item = (id: string, kind: TickerItem['kind'], date: number): TickerItem => ({ id, kind, label: '', text: '', href: '', date });
    const items = [item('a', 'zeitung', 1), item('b', 'chat', 0), item('c', 'fusion', 5), item('d', 'zeitung', 2), item('e', 'zeitung', 3), item('f', 'zeitung', 0)];
    expect(tickerOrder(items).map((i) => i.id)).toEqual(['b', 'e', 'd', 'a', 'c', 'f']);
  });
  it('turns items into news lines', () => {
    const now = new Date(2026, 8, 30, 18, 0).getTime();
    const [chat, art] = newsRows(
      [
        { id: 'c', kind: 'chat', label: '', text: '2 ungelesene', href: '/nachrichten', date: Infinity },
        { id: 'n', kind: 'zeitung', label: '', text: 'Titel', href: '/zeitung/1', date: new Date(2026, 8, 30, 9, 5).getTime() },
      ],
      now,
    );
    expect(chat).toMatchObject({ price: 'NEU', change: 'CHAT', href: '/nachrichten', mine: true });
    expect(art).toMatchObject({ name: 'Titel', price: '09:05', change: 'ZEITUNG' });
  });
  it('picks the big trades', () => {
    const t = [trade('A', 1, 1, 5e8), trade('B', 0.01, 2, 9e9), trade('C', 1, 3, 2e9), trade('D', 1, 4, 10)];
    expect(bigTrades(t).map((x) => x.securityIdentifier)).toEqual(['C', 'A']);
  });
});
