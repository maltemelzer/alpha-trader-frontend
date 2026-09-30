import { describe, expect, it } from 'vitest';
import {
  breadth,
  dayMove,
  dayReason,
  depotBubbles,
  firstSteps,
  fit,
  ghostBubbles,
  greeting,
  groupKey,
  intensity,
  layoutBubbles,
  mergeHoldings,
  newsAbout,
  shortNames,
  sparkValues,
  orbitLayout,
  orbitPoint,
  sparkPaths,
  cashReach,
  pctText,
  pack,
  radii,
  relTime,
  sinceBuy,
  todoItems,
  tradesIn,
  tradesPerMinute,
  type Changes,
  type Holding,
  type PositionLike,
  type TodoInput,
} from './derive';

const pos = (asin: string, name: string, volume: number, extra: Partial<PositionLike> = {}): PositionLike => ({
  numberOfShares: 10,
  volume,
  averageBuyingPrice: 0,
  type: 'STOCK',
  listing: { securityIdentifier: asin, name, type: 'STOCK' },
  ...extra,
});

const holding = (asin: string, name: string, value: number, extra: Partial<Holding> = {}): Holding => ({
  asin,
  name,
  type: 'STOCK',
  value,
  shares: 1,
  avg: 0,
  accounts: ['Privat'],
  ...extra,
});

const changes = (entries: [string, number][], complete = true): Changes => ({ map: new Map(entries), complete });

describe('mergeHoldings', () => {
  it('merges one security over accounts, weights the cost basis and sorts by value', () => {
    const h = mergeHoldings([
      { label: 'Privat', cash: 0, positions: [pos('A', 'Alpha', 100, { averageBuyingPrice: 10 }), pos('B', 'Beta', 500)] },
      { label: 'Firma', cash: 0, positions: [pos('A', 'Alpha', 300, { numberOfShares: 30, averageBuyingPrice: 20 })] },
    ]);
    expect(h.map((x) => x.asin)).toEqual(['B', 'A']);
    const a = h[1];
    expect(a.value).toBe(400);
    expect(a.shares).toBe(40);
    expect(a.avg).toBeCloseTo(17.5);
    expect(a.accounts).toEqual(['Privat', 'Firma']);
  });

  it('skips empty positions', () => {
    expect(mergeHoldings([{ label: 'P', cash: 0, positions: [pos('A', 'A', 0, { numberOfShares: 0 })] }])).toEqual([]);
  });
});

describe('sinceBuy', () => {
  it('needs a cost basis', () => {
    expect(sinceBuy({ avg: 0, mark: 10 })).toBeUndefined();
    expect(sinceBuy({ avg: 10, mark: 12 })).toBeCloseTo(20);
  });
});

describe('dayMove', () => {
  it('rolls positions back by their change and names the biggest mover of the day direction', () => {
    const m = dayMove([holding('A', 'Alpha', 110), holding('B', 'Beta', 90)], 100, changes([['A', 10], ['B', -10]]))!;
    // before: 100 + 100 + 100 = 300; now 300 → B lost 10, A won 10
    expect(m.delta).toBeCloseTo(0, 5);
    const up = dayMove([holding('A', 'Alpha', 110), holding('B', 'Beta', 101)], 0, changes([['A', 10], ['B', 1]]))!;
    expect(up.pct).toBeCloseTo((11 / 200) * 100, 5);
    expect(up.lead?.name).toBe('Alpha');
    expect(dayReason(up)).toBe('– vor allem dank Alpha.');
  });

  it('points at the market on a quiet day', () => {
    const m = dayMove([holding('A', 'A', 100)], 0, changes([['A', 0]]))!;
    expect(dayReason(m, { up: 1200, down: 80 })).toBe('Deine Papiere haben sich heute kaum bewegt – im Markt liegen 1.200 Papiere im Plus, 80 im Minus.');
  });

  it('counts missing securities as unchanged only when the change list is complete', () => {
    expect(dayMove([holding('A', 'A', 100)], 0, changes([], false))).toBeNull();
    expect(dayMove([holding('A', 'A', 100)], 0, changes([], true))?.pct).toBe(0);
  });

  it('names a loser on a falling day', () => {
    const m = dayMove([holding('A', 'Alpha', 90)], 0, changes([['A', -10]]))!;
    expect(m.pct).toBeCloseTo(-10);
    expect(dayReason(m)).toBe('– vor allem wegen Alpha.');
  });

  it('ignores unknown (transfer) changes', () => {
    expect(dayMove([holding('A', 'A', 100)], 0, changes([['A', NaN]]))).toBeNull();
  });
});

describe('greeting', () => {
  it('follows the hour', () => {
    expect(greeting(7)).toBe('Guten Morgen');
    expect(greeting(13)).toBe('Guten Tag');
    expect(greeting(20)).toBe('Guten Abend');
    expect(greeting(2)).toBe('Noch wach');
  });
});

describe('bubbles', () => {
  it('groups bonds by issuer and buildings by size', () => {
    expect(groupKey({ name: 'Alpha Bank 2.0000% 30/09/2026', type: 'BOND' })?.label).toBe('Alpha Bank');
    expect(groupKey({ name: 'Building 7500 05/08/2026', type: 'BUILDING' })).toMatchObject({ label: 'Immobilien 7.500 m²', short: '7.500 m²' });
    expect(groupKey({ name: 'Fortune', type: 'STOCK' })).toBeNull();
  });

  it('makes one bubble per stock, one per bond issuer and the rest beyond max', () => {
    const hs = [
      holding('S1', 'Fortune', 1000),
      holding('B1', 'Alpha Bank 2.0000% 30/09', 300, { type: 'BOND' }),
      holding('B2', 'Alpha Bank 0.0000% 01/10', 200, { type: 'BOND' }),
      holding('S2', 'Klein', 5),
      holding('S3', 'Winzig', 1),
    ];
    const b = depotBubbles(hs, changes([['S1', 2], ['B1', 1], ['B2', 0]]), 3);
    expect(b.map((x) => x.id)).toEqual(['S1', 'B:Alpha Bank', 'rest']);
    const bonds = b[1];
    expect(bonds.value).toBe(500);
    expect(bonds.sub).toBe('2 Anleihen');
    expect(bonds.today).toBeCloseTo(0.6);
    expect(b[2].sub).toBe('2 Papiere');
    expect(b[2].asins).toEqual(['S2', 'S3']);
  });

  it('ghosts leave out owned securities and transfer spikes', () => {
    const g = ghostBubbles(
      [
        { listing: { name: 'A', securityIdentifier: 'A' }, priceChangeInPercent: 3 },
        { listing: { name: 'B', securityIdentifier: 'B' }, priceChangeInPercent: 5000 },
      ],
      new Set(['A']),
      5,
    );
    expect(g).toHaveLength(1);
    expect(g[0].today).toBeUndefined();
    const h = ghostBubbles([{ listing: { name: 'C', securityIdentifier: 'C' } }], new Set(), 5, changes([['C', 4]]));
    expect(h[0].today).toBe(4);
  });

  it('sizes by the fourth root of value with a floor', () => {
    const r = radii([
      { id: 'a', kind: 'position', label: 'a', href: '', value: 10_000, asins: [] },
      { id: 'b', kind: 'position', label: 'b', href: '', value: 1, asins: [] },
    ]);
    expect(r[0]).toBe(1);
    expect(r[1]).toBeCloseTo(0.16);
  });

  it('packs without overlap and fits the box', () => {
    const rs = [1, 0.8, 0.6, 0.5, 0.5, 0.4, 0.3, 0.3, 0.2];
    const c = pack(rs, 2);
    for (let i = 0; i < c.length; i++) {
      expect(c[i].r).toBe(rs[i]);
      for (let j = i + 1; j < c.length; j++) {
        expect(Math.hypot(c[i].x - c[j].x, c[i].y - c[j].y)).toBeGreaterThanOrEqual(c[i].r + c[j].r - 1e-6);
      }
    }
    const f = fit(c, 800, 400, 10);
    for (const x of f) {
      expect(x.x - x.r).toBeGreaterThanOrEqual(9.99);
      expect(x.x + x.r).toBeLessThanOrEqual(790.01);
      expect(x.y - x.r).toBeGreaterThanOrEqual(9.99);
      expect(x.y + x.r).toBeLessThanOrEqual(390.01);
    }
  });

  it('raises tiny bubbles to the minimum radius', () => {
    const bs = [1e12, 1e6, 1e3, 1].map((v, i) => ({ id: String(i), kind: 'position' as const, label: '', href: '', value: v, asins: [] }));
    const c = layoutBubbles(bs, 360, 500, 22);
    expect(Math.min(...c.map((x) => x.r))).toBeGreaterThanOrEqual(21.5);
  });

  it('spreads sideways in a wide box', () => {
    const c = pack([1, 1, 1], 3);
    const w = Math.max(...c.map((x) => x.x)) - Math.min(...c.map((x) => x.x));
    const h = Math.max(...c.map((x) => x.y)) - Math.min(...c.map((x) => x.y));
    expect(w).toBeGreaterThan(h);
  });

  it('intensity grows with the move and caps at 1', () => {
    expect(intensity(undefined)).toBe(0);
    expect(intensity(2)).toBeCloseTo(0.5);
    expect(intensity(-50)).toBe(1);
  });
});

describe('pctText', () => {
  it('rounds for bubbles and hides noise', () => {
    expect(pctText(3.94)).toBe('▲ +3,9\u00a0%');
    expect(pctText(-25.8)).toBe('▼ −26\u00a0%');
    expect(pctText(0.02)).toBe('± 0\u00a0%');
    expect(pctText(19_597)).toBe('▲ ×197');
  });
});

describe('relTime', () => {
  const now = 1_000_000_000_000;
  it('speaks German', () => {
    expect(relTime(now - 10_000, now)).toBe('gerade eben');
    expect(relTime(now - 5 * 60_000, now)).toBe('vor 5 Min.');
    expect(relTime(now + 3 * 3_600_000, now)).toBe('in 3 Std.');
    expect(relTime(now + 86_400_000, now)).toBe('in 1 Tag');
    expect(relTime(now - 3 * 86_400_000, now)).toBe('vor 3 Tagen');
  });
});

describe('newsAbout', () => {
  it('finds tagged articles and whole-word mentions', () => {
    const hits = newsAbout(
      [
        { id: '1', title: 'Fortune wächst', dateCreated: 1 },
        { id: '2', title: 'Fortuneteller eröffnet', dateCreated: 2 },
        { id: '3', title: 'Neues', company: { name: 'X', securityIdentifier: 'STX' }, dateCreated: 3 },
        { id: '4', title: 'Nichts', content: '<p>Über <b>Fortune</b>.</p>', dateCreated: 4 },
      ],
      [
        { asin: 'STF', name: 'Fortune' },
        { asin: 'STX', name: 'Xylo AG' },
      ],
    );
    expect(hits.map((h) => h.post.id)).toEqual(['4', '3', '1']);
    expect(hits[1].about).toBe('Xylo AG');
  });
});

describe('todoItems', () => {
  const now = 1_790_000_000_000;
  const base: TodoInput = {
    now,
    unread: { messages: 0, chats: 0 },
    polls: [],
    achievements: 0,
    accounts: ['me'],
    fills: [],
    openOrders: 0,
    holdings: [],
    companyAsins: [],
    capital: [],
    dividends: [],
    mergers: [],
    news: [],
    names: {},
  };

  it('is empty when nothing waits', () => {
    expect(todoItems(base)).toEqual([]);
  });

  it('orders by urgency and links each item once', () => {
    const t = todoItems({
      ...base,
      unread: { messages: 3, chats: 1, onlyChatId: 'c1' },
      openOrders: 2,
      salary: 1234.5,
      polls: [{ id: 'p', company: { name: 'Fortune' }, endDate: now + 3_600_000 }],
      holdings: [holding('STF', 'Fortune', 100), holding('BO1', 'Alpha Bank 2% x', 100, { type: 'BOND', endDate: now + 2 * 3_600_000 })],
      dividends: [{ id: 'd', startDate: now + 86_400_000, company: { name: 'Fortune', securityIdentifier: 'STF' } }],
      mergers: [{ id: 'm', startDate: now + 86_400_000, company: { name: 'Fremd', securityIdentifier: 'STZ' } }],
      fills: [
        { date: now - 60_000, securityIdentifier: 'STF', numberOfShares: 2, price: 10, buyerSecuritiesAccount: 'me', sellerSecuritiesAccount: 'x' },
        { date: now - 120_000, securityIdentifier: 'STF', numberOfShares: 3, price: 20, buyerSecuritiesAccount: 'me', sellerSecuritiesAccount: 'y' },
        { date: now - 2 * 86_400_000, securityIdentifier: 'STF', numberOfShares: 3, price: 20, buyerSecuritiesAccount: 'me' },
      ],
      news: [{ id: 'n', title: 'Fortune kauft zu', dateCreated: now - 1000 }],
      names: { STF: 'Fortune' },
    });
    expect(t.map((x) => x.kind)).toEqual(['chat', 'poll', 'salary', 'maturity', 'dividend', 'news', 'fill', 'orders']);
    expect(t[0].href).toBe('/nachrichten/c1');
    expect(t[1].detail).toBe('Fortune · endet in 1 Std.');
    expect(t[2].detail).toBe('1.234,50 €');
    const fill = t.find((x) => x.kind === 'fill')!;
    expect(fill.title).toBe('Gekauft: 5 × Fortune');
    expect(fill.detail).toBe('zu 16,00 € · vor 1 Min.');
    expect(new Set(t.map((x) => x.id)).size).toBe(t.length);
  });

  it('bundles many maturing bonds into one line', () => {
    const hs = [1, 2, 3].map((n) => holding(`BO${n}`, `Alpha Bank ${n}`, 1, { type: 'BOND', endDate: now + n * 3_600_000 }));
    const t = todoItems({ ...base, holdings: hs });
    expect(t).toHaveLength(1);
    expect(t[0].title).toBe('3 deiner Anleihen werden fällig');
    expect(t[0].href).toBe('/wertpapier/BO1');
  });

  it('bundles more than two company events of a kind', () => {
    const caps = ['A', 'B', 'C'].map((n, k) => ({
      id: n,
      kind: 'increase' as const,
      startDate: now + (k + 1) * 86_400_000,
      company: { name: `Firma ${n}`, securityIdentifier: `ST${n}` },
    }));
    const t = todoItems({ ...base, companyAsins: ['STA', 'STB', 'STC'], capital: caps });
    expect(t).toHaveLength(1);
    expect(t[0].title).toBe('3 Kapitalmaßnahmen bei deinen Papieren');
    expect(t[0].detail).toBe('Firma A, Firma B …');
  });

  it('first steps suggest a hot security and founding only without a company', () => {
    expect(firstSteps({ name: 'Fortune', asin: 'STF' }, false).map((s) => s.href)).toEqual([
      '/markt',
      '/wertpapier/STF',
      '/unternehmen?gruenden=1',
      '/miner',
    ]);
    expect(firstSteps(undefined, true)).toHaveLength(2);
  });
});

describe('market context', () => {
  const now = 10_000_000;
  const trades = [
    { date: now - 30_000, securityIdentifier: 'A', numberOfShares: 1, price: 5 },
    { date: now - 90_000, securityIdentifier: 'B', numberOfShares: 1, price: 0.01 },
    { date: now - 120_000, securityIdentifier: 'A', numberOfShares: 1, price: 6 },
    { date: now - 400_000, securityIdentifier: 'A', numberOfShares: 1, price: 7 },
  ];
  it('counts real trades per minute', () => {
    expect(tradesPerMinute(trades, now, 5)).toBeCloseTo(0.4);
  });
  it('lists own trades newest first', () => {
    expect(tradesIn(trades, new Set(['A']), 2).map((t) => t.price)).toEqual([5, 6]);
  });
  it('counts breadth without transfer spikes', () => {
    expect(breadth(changes([['A', 1], ['B', -2], ['C', NaN], ['D', 3]]))).toEqual({ up: 2, down: 1 });
  });
});

describe('orbit', () => {
  const own = [1e6, 1e4].map((v, i) => ({ id: String(i), kind: 'position' as const, label: '', href: '', value: v, asins: [] }));
  it('keeps the cluster inside the ring', () => {
    const { own: c, orbit } = orbitLayout(own, 8, 1000, 600);
    expect(orbit).not.toBeNull();
    for (const x of c) {
      // every own bubble lies inside the inner ellipse (ring minus one ghost)
      const nx = (x.x - orbit!.cx) / (orbit!.rx - orbit!.r);
      const ny = (x.y - orbit!.cy) / (orbit!.ry - orbit!.r);
      expect(Math.hypot(nx, ny)).toBeLessThan(1);
    }
  });
  it('places ghosts evenly, the first on top', () => {
    const o = { cx: 100, cy: 100, rx: 80, ry: 50, r: 10 };
    const p = orbitPoint(o, 0, 4);
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(50);
    expect(orbitPoint(o, 1, 4).x).toBeCloseTo(180);
  });
  it('without ghosts the cluster takes the box', () => {
    expect(orbitLayout(own, 0, 400, 300).orbit).toBeNull();
  });
});

describe('sparkPaths', () => {
  it('draws a line and a closed area', () => {
    const p = sparkPaths([1, 2, 3], 100, 50)!;
    expect(p.line.startsWith('M0.0,')).toBe(true);
    expect(p.area.endsWith('Z')).toBe(true);
    expect(sparkPaths([1], 10, 10)).toBeNull();
  });
});

describe('cashReach', () => {
  it('counts shares of the biggest stock at the ask', () => {
    expect(cashReach(1000, [holding('B', 'Bond', 9e9, { type: 'BOND', ask: 99 }), holding('A', 'Alpha', 50, { ask: 30 })])).toEqual({ shares: 33, name: 'Alpha', asin: 'A' });
    expect(cashReach(10, [holding('A', 'Alpha', 50, { ask: 30 })])).toBeNull();
  });
});

describe('shortNames', () => {
  it('keeps colliding cuts apart by their end', () => {
    const s = shortNames(['falscheraccount28 Inc.', 'falscheraccount31 Inc.', 'Fortune', 'Prime Reserve Bank'], 11);
    expect(s[0]).not.toBe(s[1]);
    expect(s[2]).toBe('Fortune');
    expect(s[3]).toBe('Prime Rese…');
    expect(s[0].length).toBeLessThanOrEqual(11);
  });
});

describe('sparkValues', () => {
  it('drops transfer spikes and needs three different values', () => {
    expect(sparkValues([10, 10, 0.01, 10, 11, 12])).toEqual([10, 10, 10, 11, 12]);
    expect(sparkValues([18500, 18500, 20000, 18500])).toBeNull();
    expect(sparkValues([1, 2])).toBeNull();
  });
  it('keeps the band when the phone needs room below', () => {
    const own = [{ id: 'a', kind: 'position' as const, label: '', href: '', value: 1, asins: [] }];
    const { orbit } = orbitLayout(own, 6, 390, 500, 22, 60);
    expect(orbit!.cy + orbit!.ry + orbit!.r).toBeLessThanOrEqual(440.01);
  });
});
