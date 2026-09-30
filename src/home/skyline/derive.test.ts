import { describe, expect, it } from 'vitest';
import {
  ambientWindows,
  backdrop,
  buildingSize,
  edition,
  flashCount,
  freshTrades,
  heightShare,
  layoutCity,
  nextEvents,
  peakOrder,
  cityOrder,
  bundleEvents,
  widthFactor,
  pickTowers,
  pickWindows,
  recentCounts,
  roofOf,
  silhouette,
  towerLabel,
  towerKeyOf,
  signText,
  isFreshUnread,
  articleAsins,
  tenderProgress,
  countdown,
  tradeVolume,
  when,
  windowAt,
  windowGrid,
  type ListingRow,
} from './derive';

const row = (asin: string, type: string, volume: number | null, name = asin): ListingRow => ({ asin, name, type, volume, price: 1 });

describe('pickTowers', () => {
  const rows = [
    row('ST1', 'STOCK', 900),
    row('ST2', 'STOCK', 500),
    row('ST3', 'STOCK', 100),
    row('BD1', 'BUILDING', 300, 'Building 1200 07/08/2026'),
    row('BD2', 'BUILDING', 100, 'Building 1200 09/08/2026'),
    row('BD3', 'BUILDING', 50, 'Building 150 09/08/2026'),
    row('AC1', 'COIN', 800),
    row('ST0', 'STOCK', 0),
    row('BO1', 'BOND', 999),
  ];
  const counts = { STOCK: 2, BUILDING: 5, COIN: 1 };
  it('takes the busiest shares and coins, skips unknown types and zero volume', () => {
    const t = pickTowers(rows, null, false, [], { counts });
    expect(t.filter((x) => x.type !== 'BUILDING').map((x) => x.asin)).toEqual(['ST1', 'ST2', 'AC1']);
    expect(t[0].href).toBe('/wertpapier/ST1');
  });
  it('sums buildings per size into one tower', () => {
    const changes = new Map([['BD1', 3], ['BD2', -1]]);
    const t = pickTowers(rows, changes, true, [{ asin: 'BD9', name: 'Building 150 01/01/2026', type: 'BUILDING' }], { counts });
    const big = t.find((x) => x.asin === 'BD-1200')!;
    expect(big).toMatchObject({ volume: 400, count: 2, size: 1200, own: false, href: '/markt?art=BUILDING&gr=1200' });
    expect(big.change).toBeCloseTo((3 * 300 - 100) / 400);
    expect(t.find((x) => x.asin === 'BD-150')).toMatchObject({ volume: 50, own: true, change: 0 });
    const one = pickTowers(rows, null, false, [], { counts: { ...counts, BUILDING: 1 } });
    expect(one.filter((x) => x.type === 'BUILDING').map((x) => x.asin)).toEqual(['BD-1200']);
  });
  it('adds news companies found in the rows', () => {
    const t = pickTowers(rows, null, false, [], { counts, featured: ['ST3', 'XX', 'ST0'] });
    expect(t.some((x) => x.asin === 'ST3')).toBe(true);
    expect(t.some((x) => x.asin === 'ST0' || x.asin === 'XX')).toBe(false);
  });
  it('marks own positions and adds missing ones at the edge', () => {
    const t = pickTowers(rows, null, false, [
      { asin: 'ST2', name: 'x', type: 'STOCK' },
      { asin: 'ST9', name: 'Mine', type: 'STOCK', price: 3 },
      { asin: 'BO2', name: 'Bond', type: 'BOND' },
    ], { counts });
    expect(t.find((x) => x.asin === 'ST2')?.own).toBe(true);
    expect(t.find((x) => x.asin === 'ST9')).toMatchObject({ own: true, volume: null, price: 3 });
    expect(t.some((x) => x.asin === 'BO2')).toBe(false);
  });
  it('reads changes: known, unknown (NaN) and unchanged when the lists are complete', () => {
    const changes = new Map([['ST1', 2.5], ['ST2', NaN]]);
    const c3 = { counts: { STOCK: 3, BUILDING: 0, COIN: 0 } };
    expect(pickTowers(rows, changes, true, [], c3).map((x) => x.change)).toEqual([2.5, null, 0]);
    expect(pickTowers(rows, changes, false, [], c3)[2].change).toBeNull();
  });
});

describe('towerKeyOf', () => {
  const towers = new Set(['ST1', 'BD-1200']);
  it('finds the tower of a security or of its building size', () => {
    expect(towerKeyOf('ST1', towers)).toBe('ST1');
    expect(towerKeyOf('BDX', towers, { BDX: 'Building 1200 01/01/2026' })).toBe('BD-1200');
    expect(towerKeyOf('BDY', towers, { BDY: 'Building 150 01/01/2026' })).toBeUndefined();
    expect(towerKeyOf('ST2', towers)).toBeUndefined();
    expect(towerKeyOf(undefined, towers)).toBeUndefined();
  });
});

describe('names', () => {
  it('reads the building size and names buildings readably', () => {
    expect(buildingSize('Building 7500 24/08/2026')).toBe(7500);
    expect(buildingSize('Alphakasse')).toBeUndefined();
    expect(towerLabel({ name: 'x', type: 'BUILDING', size: 1200 })).toBe('Gebäude 1.200 m²');
    expect(towerLabel({ name: 'Alphakasse', type: 'STOCK' })).toBe('Alphakasse');
  });
  it('cuts sign texts to the tower', () => {
    expect(signText('Alphakasse', 200, 20)).toBe('Alphakasse');
    expect(signText('Alphakasse SE', 35 + 6.4 * 9, 20)).toBe('Alphakas…');
    expect(signText('Alphakasse SE', 34 + 6.4 * 6, 20)).toBeNull();
    expect(signText('Cat Inc.', 35 + 6.4 * 8, 20)).toBe('Cat Inc.');
    expect(signText('Alphakasse', 60, 20)).toBeNull();
    expect(signText('Alphakasse', 200, 10)).toBeNull();
  });
});

describe('peakOrder', () => {
  it('puts the biggest in the middle', () => {
    expect(peakOrder(['a', 'b', 'c', 'd', 'e'])).toEqual(['d', 'b', 'a', 'c', 'e']);
    expect(peakOrder([])).toEqual([]);
  });
});

describe('heightShare', () => {
  it('scales by log between min and max, with a floor', () => {
    expect(heightShare(1000, 10, 1000)).toBe(1);
    expect(heightShare(10, 10, 1000)).toBeCloseTo(0.2);
    expect(heightShare(100, 10, 1000)).toBeCloseTo(0.2 + 0.8 * Math.pow(0.5, 0.8));
    expect(heightShare(null, 10, 1000)).toBeLessThan(0.2);
    expect(heightShare(5, 5, 5)).toBe(1);
  });
});

describe('layoutCity', () => {
  const towers = pickTowers(
    [
      row('ST1', 'STOCK', 1e9),
      row('ST2', 'STOCK', 1e6),
      row('ST3', 'STOCK', 1e7),
      row('BD1', 'BUILDING', 1e5, 'Building 7500 01/08/2026'),
      row('BD2', 'BUILDING', 1e6, 'Building 150 01/08/2026'),
      row('AC1', 'COIN', 1e8),
    ],
    null,
    false,
    [],
  );
  it('orders districts, fills the width, keeps towers apart', () => {
    const c = layoutCity(towers, { width: 600, height: 300, minUnit: 4, maxUnit: 200 });
    expect(c.width).toBe(600);
    expect(c.towers.map((t) => t.asin)).toEqual(['ST2', 'ST1', 'ST3', 'AC1', 'BD-150', 'BD-7500']);
    // shares: the city order of the three (core pattern 2, 0, 1)
    for (let i = 1; i < c.towers.length; i++) expect(c.towers[i].x).toBeGreaterThan(c.towers[i - 1].x + c.towers[i - 1].w);
    const last = c.towers[c.towers.length - 1];
    expect(last.x + last.w).toBeCloseTo(600);
    expect(c.towers.find((t) => t.asin === 'ST1')!.h).toBe(300);
    expect(c.blocks.map((b) => b.label)).toEqual(['Aktien', 'Coin', 'Immobilien']);
  });
  it('becomes a panorama below the minimum unit and centres above the maximum', () => {
    const wide = layoutCity(towers, { width: 100, height: 200, minUnit: 20 });
    expect(wide.width).toBeGreaterThan(100);
    const narrow = layoutCity(towers, { width: 2000, height: 200, maxUnit: 30 });
    expect(narrow.width).toBe(2000);
    expect(narrow.towers[0].x).toBeGreaterThan(0);
  });
});

describe('windows', () => {
  const t = { x: 10, w: 30, h: 100 };
  it('fits a centred raster inside the facade', () => {
    const g = windowGrid(t, 50, 30);
    expect(g.cols).toBeGreaterThan(0);
    expect(g.rows).toBeGreaterThan(0);
    const last = windowAt(g, g.cols * g.rows - 1);
    expect(last.x + g.ww).toBeLessThanOrEqual(t.x + t.w);
    expect(last.y + g.wh).toBeLessThanOrEqual(50 + t.h);
    expect(g.x0 - t.x).toBeCloseTo(t.x + t.w - (last.x + g.ww));
  });
  it('picks distinct, stable windows', () => {
    const a = pickWindows('trade-1', 5, 40);
    expect(new Set(a).size).toBe(5);
    expect(pickWindows('trade-1', 5, 40)).toEqual(a);
    expect(pickWindows('x', 10, 3)).toHaveLength(3);
    expect(pickWindows('x', 3, 0)).toEqual([]);
  });
  it('lights more windows in busier towers, keeping the earlier ones', () => {
    const quiet = ambientWindows('ST1', 1, 200);
    const busy = ambientWindows('ST1', 8, 200);
    expect(busy.length).toBeGreaterThan(quiet.length);
    expect(busy.slice(0, quiet.length)).toEqual(quiet);
  });
  it('lights one to six windows per trade', () => {
    expect(flashCount(50)).toBe(1);
    expect(flashCount(1e6)).toBe(3);
    expect(flashCount(1e14)).toBe(6);
    expect(flashCount(0)).toBe(1);
  });
});

describe('trades', () => {
  const now = 1_000_000_000;
  const trades = [
    { id: 'a', securityIdentifier: 'ST1', price: 2, numberOfShares: 10, date: now - 1000 },
    { id: 'b', securityIdentifier: 'ST1', price: 0.01, numberOfShares: 10, date: now - 2000 },
    { id: 'c', securityIdentifier: 'ST2', price: 5, numberOfShares: 1, volume: 5, date: now - 3000 },
    { id: 'd', securityIdentifier: 'ST2', price: 5, numberOfShares: 1, date: now - 20 * 60_000 },
  ];
  it('values trades and leaves transfers out', () => {
    expect(tradeVolume(trades[0])).toBe(20);
    expect(tradeVolume(trades[1])).toBe(0);
  });
  it('counts recent trades per security', () => {
    const c = recentCounts(trades, now);
    expect(c.get('ST1')).toBe(1);
    expect(c.get('ST2')).toBe(1);
  });
  it('returns unseen trades oldest first, capped', () => {
    expect(freshTrades(trades, new Set(['a'])).map((t) => t.id)).toEqual(['d', 'c']);
    expect(freshTrades(trades, new Set(), 1).map((t) => t.id)).toEqual(['a']);
  });
});

describe('sky', () => {
  it('names the edition by the hour', () => {
    expect(edition(7)).toBe('Morgenausgabe');
    expect(edition(12)).toBe('Mittagsausgabe');
    expect(edition(20)).toBe('Abendausgabe');
    expect(edition(2)).toBe('Nachtausgabe');
  });
  it('says when', () => {
    const now = new Date(2026, 8, 30, 10, 0).getTime();
    expect(when(now + 30 * 60_000, now)).toBe('in 30 Min.');
    expect(when(now + 3 * 3_600_000, now)).toBe('in 3 Std.');
    expect(when(new Date(2026, 8, 30, 20, 15).getTime(), now)).toBe('heute 20:15');
    expect(when(new Date(2026, 9, 1, 13, 0).getTime(), now)).toBe('morgen 13:00');
    expect(when(new Date(2026, 9, 2, 13, 0).getTime(), now)).toBe('Fr. 13:00');
  });
  it('puts chats first, then one of each kind, own ones first', () => {
    const now = 100;
    const ev = nextEvents(
      [
        { key: '1', kind: 'dividende', title: 'a', at: 300, href: '' },
        { key: '2', kind: 'fusion', title: 'b', at: 200, href: '' },
        { key: '3', kind: 'kapital', title: 'c', at: 400, href: '', own: true },
        { key: '4', kind: 'chat', title: 'd', at: 50, href: '' },
        { key: '5', kind: 'kapital', title: 'old', at: 50, href: '' },
        { key: '6', kind: 'fusion', title: 'e', at: 3_600_000, href: '' },
      ],
      now,
      5,
    );
    expect(ev.map((e) => e.key)).toEqual(['4', '3', '2', '1', '6']);
  });
  it('bundles one kind at the same time, keeps own ones single', () => {
    const at = 1_000_000_000;
    const b = bundleEvents([
      { key: 'a', kind: 'fusion', title: 'A geht in X auf', subject: 'A', at, href: '/wertpapier/A' },
      { key: 'b', kind: 'fusion', title: 'B geht in X auf', subject: 'B', at: at + 60_000, href: '' },
      { key: 'c', kind: 'fusion', title: 'C geht in X auf', subject: 'C', at, href: '', own: true },
      { key: 'd', kind: 'dividende', title: 'Dividende D', at, href: '' },
      { key: 't', kind: 'tender', title: 'Zinstender', at, href: '' },
    ]);
    expect(b.map((e) => e.title).sort()).toEqual(['2 Fusionen: A, B', 'C geht in X auf', 'Dividende D', 'Zinstender'].sort());
    expect(b.find((e) => e.title.startsWith('2'))?.href).toBe('/kapitalmassnahmen?art=fusionen');
  });
});

describe('silhouettes', () => {
  const t = { asin: 'STX', type: 'STOCK' as const, x: 0, w: 20, h: 200 };
  it('gives the coin a dome, the tallest share a mast, low towers a flat roof', () => {
    expect(roofOf({ ...t, type: 'COIN' }, false)).toBe('dome');
    expect(roofOf(t, true)).toBe('antenna');
    expect(roofOf({ ...t, h: 40 }, false)).toBe('flat');
    expect(roofOf({ ...t, type: 'BUILDING' }, false)).toBe('flat');
    expect(['setback', 'stepped', 'flat']).toContain(roofOf(t, false));
  });
  it('keeps every part on the tower and the body on the ground', () => {
    for (const roof of ['flat', 'setback', 'stepped', 'dome', 'antenna'] as const) {
      const s = silhouette(t, 300, roof);
      expect(s.body.y + s.body.h).toBeCloseTo(300);
      for (const c of s.crown) {
        expect(c.y).toBeGreaterThanOrEqual(100);
        expect(c.x).toBeGreaterThanOrEqual(0);
        expect(c.x + c.w).toBeLessThanOrEqual(20);
      }
      expect(s.cap.y).toBeGreaterThanOrEqual(100);
    }
    expect(silhouette(t, 300, 'setback').cap.w).toBeLessThan(20);
  });
});

describe('backdrop', () => {
  it('covers the width with low, stable silhouettes', () => {
    const b = backdrop(500, 200);
    expect(b[0].x).toBeLessThanOrEqual(0);
    const last = b[b.length - 1];
    expect(last.x + last.w).toBeGreaterThanOrEqual(500);
    for (const x of b) expect(x.h).toBeLessThanOrEqual(200 * 0.42);
    expect(backdrop(500, 200)).toEqual(b);
  });
});

describe('links and clock', () => {
  it('announces only chats whose last message is someone else’s and unread', () => {
    const base = { publicChat: false, numOfUnreadMessages: 1 };
    expect(isFreshUnread({ ...base, lastMessage: { read: false, sender: { username: 'bob' } } }, 'me')).toBe(true);
    expect(isFreshUnread({ ...base, lastMessage: { read: true, sender: { username: 'bob' } } }, 'me')).toBe(false);
    expect(isFreshUnread({ ...base, lastMessage: { read: false, sender: { username: 'me' } } }, 'me')).toBe(false);
    expect(isFreshUnread({ ...base, publicChat: true, lastMessage: { read: false } }, 'me')).toBe(false);
    expect(isFreshUnread({ ...base, numOfUnreadMessages: 0, lastMessage: { read: false } }, 'me')).toBe(false);
  });
  it('finds the securities of an article', () => {
    expect(articleAsins({ listing: { securityIdentifier: 'A' }, company: { securityIdentifier: 'A' } })).toEqual(['A']);
    expect(articleAsins({ company: { securityIdentifier: 'B' } })).toEqual(['B']);
    expect(articleAsins({})).toEqual([]);
  });
  it('measures the tender window', () => {
    expect(tenderProgress(undefined, 0)).toBeNull();
    expect(tenderProgress(86_400_000, 0)).toBe(0);
    expect(tenderProgress(43_200_000, 0)).toBeCloseTo(0.5);
    expect(tenderProgress(10, 20)).toBe(1);
    expect(countdown(14 * 60_000, 0)).toBe('14 Min.');
    expect(countdown(192 * 60_000, 0)).toBe('3:12 Std.');
  });
});

describe('city order', () => {
  const sorted = Array.from({ length: 20 }, (_, i) => ({ asin: `ST${String(i).padStart(2, '0')}`, rank: i }));
  it('keeps every tower, the biggest near the middle, stable', () => {
    const o = cityOrder(sorted);
    expect(o).toHaveLength(20);
    expect(new Set(o.map((t) => t.asin)).size).toBe(20);
    const mid = o.findIndex((t) => t.rank === 0);
    expect(Math.abs(mid - 10)).toBeLessThanOrEqual(2);
    expect(cityOrder(sorted)).toEqual(o);
  });
  it('is not a bell curve: neighbours go up and down on each side', () => {
    const o = cityOrder(sorted).map((t) => t.rank);
    const mid = o.indexOf(0);
    const left = o.slice(0, mid).reverse();
    const right = o.slice(mid + 1);
    const monotonic = (a: number[]) => a.every((x, i) => i === 0 || x > a[i - 1]);
    expect(monotonic(left) && monotonic(right)).toBe(false);
    // …but the outer ends are the small ones
    expect(Math.min(o[0], o[o.length - 1])).toBeGreaterThan(10);
  });
  it('varies share widths by ASIN, keeps coin and buildings fixed', () => {
    const ws = sorted.map((t) => widthFactor({ asin: t.asin, type: 'STOCK' }));
    expect(Math.min(...ws)).toBeGreaterThanOrEqual(0.85);
    expect(Math.max(...ws)).toBeLessThanOrEqual(1.2);
    expect(new Set(ws).size).toBeGreaterThan(2);
    expect(widthFactor({ asin: 'x', type: 'COIN' })).toBe(1.7);
  });
});
