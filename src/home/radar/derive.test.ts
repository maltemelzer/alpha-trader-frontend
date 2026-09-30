import { describe, expect, it } from 'vitest';
import type { Trade } from '../../flows/derive';
import {
  angleOf,
  bands,
  clusterEchoes,
  depotDay,
  changeText,
  dayChanges,
  dotSize,
  echoRadius,
  fade,
  glow,
  hitTest,
  hottest,
  HOUR,
  MIN,
  polar,
  pop,
  rankContacts,
  relTime,
  rimMarks,
  ownRings,
  ringOf,
  spreadAngles,
  groupRim,
  tradesPerMinute,
  turnover,
  type Contact,
} from './derive';

const NOW = 1_790_000_000_000;
let n = 0;
const trade = (asin: string, ago: number, price: number, shares = 10): Trade => ({
  id: `t${n++}`,
  date: NOW - ago,
  asin,
  shares,
  price,
  volume: price * shares,
  buyer: 'b',
  seller: 's',
  buyerName: '',
  sellerName: '',
});

describe('ringOf', () => {
  it('reads the class from the ASIN prefix', () => {
    expect(ringOf('STSN3G03LB')).toBe('stock');
    expect(ringOf('ACALPHCOIN')).toBe('coin');
    expect(ringOf('BOADHCPS2D')).toBe('bond');
    expect(ringOf('READHCPS2D')).toBe('bond');
    expect(ringOf('SB12345678')).toBe('bond');
    expect(ringOf('BD12345678')).toBe('other');
    expect(ringOf('WAS6HHKLOM')).toBe('other');
  });
});

describe('bands', () => {
  it('fills the annulus from core to outer without gaps', () => {
    const b = bands(0.3, 0.84);
    expect(b[0].inner).toBe(0.3);
    expect(b[b.length - 1].outer).toBeCloseTo(0.84);
    for (let i = 1; i < b.length; i++) expect(b[i].inner).toBeCloseTo(b[i - 1].outer);
    expect(b[b.length - 1].id).toBe('stock');
  });
});

describe('clusterEchoes', () => {
  it('folds one security within a minute bucket and compares with the trade before', () => {
    const base = Math.floor((NOW - 5 * MIN) / MIN) * MIN; // start of a bucket
    const ago = (ms: number) => NOW - (base + ms);
    const trades = [trade('STA', 20 * MIN, 10), trade('STA', ago(1000), 11), trade('STA', ago(30_000), 12)];
    const echoes = clusterEchoes(trades, NOW);
    expect(echoes).toHaveLength(2);
    const e = echoes[0];
    expect(e.count).toBe(2);
    expect(e.price).toBe(12);
    expect(e.volume).toBe(230);
    expect(e.change).toBeCloseTo(20); // 10 → 12
    expect(echoes[1].change).toBeNull();
  });

  it('leaves out transfers and trades before the window, but uses them as reference', () => {
    const trades = [trade('STA', 2 * HOUR, 10), trade('STA', 10 * MIN, 11), trade('STB', 5 * MIN, 0.01)];
    const echoes = clusterEchoes(trades, NOW);
    expect(echoes).toHaveLength(1);
    expect(echoes[0].change).toBeCloseTo(10);
  });

  it('keeps own and recent echoes when capping', () => {
    const trades = [
      trade('STBIG', 30 * MIN, 1000, 1000),
      trade('STOWN', 40 * MIN, 1, 1),
      trade('STNEW', 30_000, 1, 1),
      trade('STSMALL', 50 * MIN, 1, 1),
    ];
    const echoes = clusterEchoes(trades, NOW, { max: 3, keep: new Set(['STOWN']) });
    expect(echoes.map((e) => e.asin).sort()).toEqual(['STBIG', 'STNEW', 'STOWN']);
  });

  it('ignores jumps beyond ×10', () => {
    const echoes = clusterEchoes([trade('STA', 20 * MIN, 1), trade('STA', 5 * MIN, 50)], NOW);
    expect(echoes[0].change).toBeNull();
  });
});

describe('geometry', () => {
  it('puts now on top and older counter-clockwise', () => {
    expect(angleOf(NOW, NOW)).toBeCloseTo(0);
    expect(angleOf(NOW - 15 * MIN, NOW)).toBeCloseTo(-Math.PI / 2);
    const p = polar(0, 0, 10, angleOf(NOW - 15 * MIN, NOW));
    expect(p.x).toBeCloseTo(-10); // 9 o'clock
    expect(p.y).toBeCloseTo(0);
    expect(polar(0, 0, 10, 0).y).toBeCloseTo(-10); // top
  });

  it('moves rising echoes outward and falling ones inward within their ring', () => {
    const b = bands();
    const stock = b.find((x) => x.id === 'stock')!;
    const mid = (stock.inner + stock.outer) / 2;
    const up = echoRadius({ ring: 'stock', change: 5, key: 'a' }, b);
    const down = echoRadius({ ring: 'stock', change: -5, key: 'a' }, b);
    expect(up).toBeGreaterThan(mid);
    expect(down).toBeLessThan(mid);
    expect(up).toBeLessThan(stock.outer);
    expect(down).toBeGreaterThan(stock.inner);
    const flat = echoRadius({ ring: 'stock', change: 0, key: 'x' }, b);
    expect(Math.abs(flat - mid)).toBeLessThan((stock.outer - stock.inner) * 0.1);
  });

  it('scales dots with the log of the volume, bounded', () => {
    expect(dotSize(1)).toBeCloseTo(1.4);
    expect(dotSize(1e6)).toBeGreaterThan(dotSize(1e4));
    expect(dotSize(1e15)).toBe(9.5);
  });

  it('fades with age but never below a quarter-ish', () => {
    expect(fade(0)).toBe(1);
    expect(fade(HOUR)).toBeCloseTo(0.22);
    expect(fade(30 * MIN)).toBeLessThan(fade(10 * MIN));
  });

  it('glows behind the clockwise sweep only', () => {
    expect(glow(1, 1)).toBe(1);
    expect(glow(1 - 0.5, 1)).toBeGreaterThan(0); // just passed
    expect(glow(1 + 0.2, 1)).toBe(0); // not yet reached
    expect(glow(1 - Math.PI, 1)).toBe(0);
  });

  it('pops in with an overshoot and settles', () => {
    expect(pop(-1)).toBe(0);
    expect(pop(175)).toBeCloseTo(1.8);
    expect(pop(700)).toBe(1);
    expect(pop(400)).toBeGreaterThan(1);
  });

  it('hits the nearest dot within its size', () => {
    const echo = clusterEchoes([trade('STA', MIN, 1)], NOW)[0];
    const placed = [
      { echo, x: 10, y: 10, r: 3 },
      { echo, x: 30, y: 10, r: 3 },
    ];
    expect(hitTest(placed, 12, 11)).toBe(placed[0]);
    expect(hitTest(placed, 29, 10)).toBe(placed[1]);
    expect(hitTest(placed, 100, 100)).toBeNull();
  });
});

describe('contacts', () => {
  const c = (id: string, t: number, urgent = false): Contact => ({ id, kind: 'news', t, title: id, text: '', href: '/', urgent });

  it('puts the last hour at its minute and what comes next in a short arc after „jetzt“', () => {
    const marks = rimMarks([c('a', NOW - 15 * MIN), c('late', NOW + 3 * HOUR), c('soon', NOW + HOUR), c('old', NOW - 2 * HOUR), c('edge', NOW - 55 * MIN)], NOW);
    const past = marks.filter((m) => !m.next);
    expect(past).toHaveLength(1);
    expect(past[0].a).toBeCloseTo(-Math.PI / 2);
    const next = marks.filter((m) => m.next);
    expect(next.map((m) => m.items[0].id)).toEqual(['soon', 'late']);
    expect(next[0].a).toBeGreaterThan(0);
    expect(next[1].a).toBeGreaterThan(next[0].a);
  });

  it('ranks unread first, then by distance from now', () => {
    const list = rankContacts([c('old', NOW - 5 * HOUR), c('soon', NOW + HOUR), c('later', NOW + 3 * HOUR), c('chat', NOW - 20 * HOUR, true)], NOW);
    expect(list.map((x) => x.id)).toEqual(['chat', 'soon', 'old', 'later']);
  });

  it('groups the same kind at nearly the same place', () => {
    const g = groupRim([
      { kind: 'merger', a: 0.5 },
      { kind: 'merger', a: 0.52 },
      { kind: 'news', a: 0.51 },
      { kind: 'merger', a: 1.5 },
    ]);
    expect(g.map((x) => x.items.length)).toEqual([2, 1, 1]);
  });

  it('spreads angles that collide', () => {
    const out = spreadAngles([0.5, 0.52, -1], 0.1);
    expect(out[0]).toBe(0.5);
    expect(out[1]).toBeCloseTo(0.6);
    expect(out[2]).toBe(-1);
  });

  it('writes relative times', () => {
    expect(relTime(NOW - 3 * MIN, NOW)).toBe('vor 3 min');
    expect(relTime(NOW + 2 * HOUR, NOW)).toBe('in 2 Std.');
    expect(relTime(NOW - 2 * 24 * HOUR, NOW)).toBe('vor 2 T.');
    expect(relTime(NOW - 10_000, NOW)).toBe('gerade');
  });
});

describe('ownRings', () => {
  it('rings only the biggest echo of each own security', () => {
    const echoes = clusterEchoes([trade('ACX', 5 * MIN, 10, 1), trade('ACX', 20 * MIN, 10, 100), trade('STY', 3 * MIN, 1)], NOW);
    const rings = ownRings(echoes, new Set(['ACX']));
    expect(rings.size).toBe(1);
    expect(echoes.find((e) => rings.has(e.key))!.volume).toBe(1000);
  });
});

describe('figures', () => {
  const trades = [trade('STA', MIN, 10), trade('STA', 2 * MIN, 12), trade('STB', 3 * MIN, 5, 1000), trade('STC', 20 * MIN, 1), trade('STD', MIN, 0.01)];

  it('counts trades per minute without transfers', () => {
    expect(tradesPerMinute(trades, NOW, 10 * MIN)).toBeCloseTo(0.3);
  });

  it('sums the turnover', () => {
    expect(turnover(trades, NOW - 10 * MIN)).toBe(100 + 120 + 5000);
  });

  it('finds the hottest security with its move', () => {
    const h = hottest(trades, NOW)!;
    expect(h.asin).toBe('STA');
    expect(h.count).toBe(2);
    expect(h.change).toBeCloseTo(((10 - 12) / 12) * 100);
    expect(hottest([], NOW)).toBeNull();
  });

  it('moves the depot by the change to the previous day, unknown when a position is unknown', () => {
    const row = (asin: string, p: number) => ({ listing: { securityIdentifier: asin }, priceChangeInPercent: p });
    const changes = dayChanges([row('STA', 10), row('STZ', 0)], [row('STB', -50), row('STJ', 5000), row('STQ', 0)])!;
    expect(changes.complete).toBe(true);
    const m = depotDay([{ securityIdentifier: 'STA', volume: 1100 }, { securityIdentifier: 'STX', volume: 50 }], 1000, changes)!;
    expect(m.delta).toBeCloseTo(100);
    expect(m.pct).toBeCloseTo((100 / 2050) * 100);
    expect(depotDay([{ securityIdentifier: 'STJ', volume: 1 }], 0, changes)).toBeNull();
    expect(depotDay([], 10, null)).toBeNull();
    const partial = dayChanges([row('STA', 3)], [row('STB', -2)])!;
    expect(depotDay([{ securityIdentifier: 'STX', volume: 1 }], 0, partial)).toBeNull();
  });
});

describe('changeText', () => {
  const nb = String.fromCharCode(0xa0);
  it('takes the arrow from the value, not the rounding', () => {
    expect(changeText(5.4, { unit: '€' })).toEqual({ dir: 'up', text: `▲${nb}+5,40${nb}€` });
    expect(changeText(0.0003)).toEqual({ dir: 'up', text: `▲${nb}<${nb}0,01${nb}%` });
    expect(changeText(-0.02, { decimals: 1 })).toEqual({ dir: 'down', text: `▼${nb}<${nb}0,1${nb}%` });
    expect(changeText(-1.25, { decimals: 1 }).text).toBe(`▼${nb}−1,3${nb}%`);
    expect(changeText(0).dir).toBe('flat');
    expect(changeText(0).text.startsWith('±')).toBe(true);
  });
});
