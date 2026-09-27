import { describe, expect, it } from 'vitest';
import type { SecurityOrderLogEntryView } from '../api/types';
import {
  accountHref,
  accountStats,
  accountsToResolve,
  bucketMs,
  collectPages,
  displayName,
  forceLayout,
  grouping,
  involves,
  kindOfAsin,
  kindSplit,
  mergeWindow,
  netFlows,
  network,
  offMarket,
  pairs,
  parseAccount,
  shownPrivateAccounts,
  REST_ID,
  roundTrips,
  sankey,
  splitTransfers,
  summary,
  timeline,
  transferGroups,
  transferSides,
  originSankey,
  selfTotals,
  collectStreams,
  ownerAccounts,
  priceNow,
  type Trade,
} from './derive';

let n = 0;
const tr = (seller: string, buyer: string, volume: number, o: Partial<Trade> = {}): Trade => ({
  id: `t${n++}`,
  date: 1_000_000,
  asin: 'STAAAAAAAA',
  shares: 10,
  price: volume / 10,
  volume,
  buyer,
  seller,
  buyerName: buyer.startsWith('p') ? '' : buyer.toUpperCase(),
  sellerName: seller.startsWith('p') ? '' : seller.toUpperCase(),
  ...o,
});

describe('collectPages', () => {
  const log = (count: number, newest: number): SecurityOrderLogEntryView[] =>
    [...Array(count).keys()].map((i) => ({ id: `x${i}`, date: newest - i, price: 1, numberOfShares: 1, volume: 1 }));

  it('pages back with the oldest date as next end (inclusive) until a short page', async () => {
    const all = log(2500, 10_000);
    const calls: [number, number][] = [];
    const res = await collectPages(
      async (start, end) => {
        calls.push([start, end]);
        return all.filter((e) => e.date! >= start && e.date! <= end).slice(0, 1000);
      },
      0,
      10_000,
      10,
    );
    expect(res.trades).toHaveLength(2500);
    expect(res.complete).toBe(true);
    expect(res.requests).toBe(3);
    expect(calls[1][1]).toBe(10_000 - 999);
    expect(res.trades[0].date).toBeGreaterThan(res.trades[1].date);
  });

  it('stops at maxPages and reports where it really starts', async () => {
    const all = log(5000, 10_000);
    const res = await collectPages(async (s, e) => all.filter((x) => x.date! >= s && x.date! <= e).slice(0, 1000), 0, 10_000, 2);
    expect(res.complete).toBe(false);
    expect(res.from).toBe(10_000 - 1998);
  });
});

describe('mergeWindow', () => {
  it('dedupes by id, drops old trades, newest first', () => {
    const a = tr('a', 'b', 1, { id: 'A', date: 5 });
    const b = tr('a', 'b', 1, { id: 'B', date: 9 });
    const old = tr('a', 'b', 1, { id: 'O', date: 1 });
    expect(mergeWindow([b, a], [a, old], 2).map((t) => t.id)).toEqual(['B', 'A']);
  });
});

describe('kinds and transfers', () => {
  it('reads the kind from the ASIN prefix', () => {
    expect(kindOfAsin('STALPHBANK')).toBe('STOCK');
    expect(kindOfAsin('BOA33HX1SS')).toBe('BOND');
    expect(kindOfAsin('SRXXXXXXXX')).toBe('BOND');
    expect(kindOfAsin('ACALPHCOIN')).toBe('COIN');
    expect(kindOfAsin('BD12345678')).toBe('BUILDING');
    expect(kindOfAsin('INXXXXXXXX')).toBe('OTHER');
  });

  it('separates token-price transfers from trades', () => {
    const { trades, transfers } = splitTransfers([tr('a', 'b', 100), tr('a', 'b', 0, { price: 0 }), tr('a', 'b', 1, { price: 0.01 })]);
    expect(trades).toHaveLength(1);
    expect(transfers).toHaveLength(2);
  });

  it('splits volume by kind in fixed order', () => {
    const s = kindSplit([tr('a', 'b', 5, { asin: 'BOXXXXXXXX' }), tr('a', 'b', 3), tr('a', 'b', 2)]);
    expect(s.map((k) => [k.kind, k.volume, k.trades])).toEqual([
      ['STOCK', 5, 2],
      ['BOND', 5, 1],
    ]);
  });
});

describe('parseAccount', () => {
  it('reads company accounts as name, ASIN and CEO', () => {
    expect(parseAccount({ id: '1', name: 'Alpha Bank (STALPHBANK) | Alphabanker', privateAccount: false })).toEqual({
      id: '1',
      name: 'Alpha Bank',
      private: false,
      asin: 'STALPHBANK',
      owner: 'Alphabanker',
    });
    expect(parseAccount({ id: '2', name: 'MrTom', privateAccount: true })).toEqual({ id: '2', name: 'MrTom', private: true, owner: 'MrTom' });
    expect(parseAccount({ id: '3', name: 'Odd name', privateAccount: false })?.asin).toBeUndefined();
    expect(parseAccount(undefined)).toBeUndefined();
    expect(parseAccount({ id: '4', name: 'ef-sec-acc-d5fd884c-f95d-49c1-9b56-8e68fba4d589', privateAccount: true })).toEqual({
      id: '4',
      name: 'ETF-Fonds d5fd',
      private: false,
      fund: true,
    });
  });

  it('links accounts and organisations', () => {
    const infos = {
      c: parseAccount({ id: 'c', name: 'X AG (STXXXXXXXX) | bob', privateAccount: false }),
      p: parseAccount({ id: 'p', name: 'bob', privateAccount: true }),
    };
    expect(accountHref('c', infos)).toBe('/unternehmen/STXXXXXXXX');
    expect(accountHref('p', infos)).toBe('/spieler/bob');
    expect(accountHref('org:bob', infos)).toBe('/spieler/bob');
    expect(accountHref('zz', infos)).toBeUndefined();
    expect(displayName('p', '', infos)).toBe('bob (privat)');
    expect(displayName('zz', '', infos)).toBe('Privatdepot');
  });
});

describe('shownPrivateAccounts', () => {
  it('lists the private accounts the views show, never company accounts', () => {
    const trade = (id: string, seller: string, sellerName: string, buyer: string, buyerName: string, volume: number, price = 10) =>
      ({ id, asin: 'STAAAAAAAA', price, shares: volume / price, volume, date: 1, seller, sellerName, buyer, buyerName }) as Trade;
    const trades = [trade('1', 'p1', '', 'c1', 'Firma AG', 500), trade('2', 'c1', 'Firma AG', 'p2', '', 300), trade('3', 'p2', '', 'p1', '', 50)];
    const transfers = [trade('4', 'p3', '', 'p4', '', 0.01, 0.01)];
    expect(shownPrivateAccounts(trades, transfers).sort()).toEqual(['p1', 'p2', 'p3', 'p4']);
  });
});

describe('accountStats, pairs, summary', () => {
  const trades = [tr('a', 'b', 100), tr('b', 'a', 40), tr('c', 'a', 10), tr('a', 'a', 5)];

  it('sums bought/sold per account, self trades count once', () => {
    const s = accountStats(trades);
    const a = s.find((x) => x.id === 'a')!;
    expect(a.bought).toBe(55);
    expect(a.sold).toBe(105);
    expect(a.trades).toBe(4);
    expect(s[0].id).toBe('a');
  });

  it('groups accounts of one owner into an organisation', () => {
    const infos = {
      a: parseAccount({ id: 'a', name: 'A (STAAAAAAAA) | bob', privateAccount: false }),
      c: parseAccount({ id: 'c', name: 'bob', privateAccount: true }),
    };
    const s = accountStats(trades, grouping(infos, true));
    const org = s.find((x) => x.id === 'org:bob')!;
    expect(org.members).toBe(2);
    expect(org.bought).toBe(55 + 0);
    expect(org.sold).toBe(105 + 10);
    // Trade c → a is inside the organisation: no pair.
    expect(pairs(trades, grouping(infos, true)).map((p) => [p.a, p.b])).toEqual([['b', 'org:bob']]);
    const ownerOf = (id: string) => infos[id as 'a' | 'c']?.owner;
    expect(involves(trades[2], 'org:bob', ownerOf)).toBe(true);
    expect(involves(trades[1], 'org:bob', ownerOf)).toBe(true);
    expect(involves({ ...trades[1], buyer: 'x', seller: 'y' }, 'org:bob', ownerOf)).toBe(false);
    expect(involves(trades[0], 'c')).toBe(false);
  });

  it('pairs are undirected with both directions', () => {
    const p = pairs(trades);
    expect(p[0]).toMatchObject({ a: 'a', b: 'b', volume: 140, aToB: 100, bToA: 40, trades: 2 });
  });

  it('measures concentration by the top 10 accounts', () => {
    const many = [...Array(12).keys()].map((i) => tr(`s${i}`, `b${i}`, i === 0 ? 1000 : 1));
    const s = summary(many, accountStats(many));
    expect(s.trades).toBe(12);
    // 11 of 12 trades are 1 €: the top 10 (s0, b0 and 8 more) hold (2000 + 8) of 2 × 1011.
    expect(s.top10Share).toBeCloseTo(2008 / 2022);
    expect(summary([], []).top10Share).toBe(0);
  });

  it('lists net buyers first, then net sellers from small to large', () => {
    const f = netFlows(accountStats([tr('a', 'b', 100), tr('c', 'd', 10), tr('e', 'f', 50)]), 2);
    expect(f.map((s) => s.id)).toEqual(['b', 'f', 'e', 'a']);
  });
});

describe('network', () => {
  it('keeps the largest accounts and puts the rest into one node', () => {
    const trades = [tr('a', 'b', 100), tr('a', 'c', 50), tr('d', 'e', 1), tr('a', 'e', 2)];
    const net = network(trades, undefined, 3);
    expect(net.nodes.map((x) => x.id)).toEqual(['a', 'b', 'c', REST_ID]);
    expect(net.nodes[3].members).toBe(2);
    // a–e goes to the rest node; d–e is inside the rest and not drawn.
    expect(net.edges).toHaveLength(3);
    expect(net.nodes.every((x) => Number.isFinite(x.x) && Math.abs(x.x) <= 1.0001)).toBe(true);
  });

  it('keeps a focused account even when it is small', () => {
    const trades = [tr('a', 'b', 100), tr('c', 'd', 50), tr('x', 'y', 1)];
    expect(network(trades, undefined, 2, 'y').nodes.map((x) => x.id)).toContain('y');
  });

  it('can pick the busiest accounts instead of the largest', () => {
    const trades = [tr('a', 'b', 1000), tr('c', 'd', 1), tr('c', 'd', 1), tr('d', 'c', 1)];
    expect(network(trades, undefined, 2, undefined, 'trades').nodes.slice(0, 2).map((x) => x.id).sort()).toEqual(['c', 'd']);
    expect(network(trades, undefined, 2).nodes.slice(0, 2).map((x) => x.id).sort()).toEqual(['a', 'b']);
  });
});

describe('forceLayout', () => {
  const edges = [
    { a: 0, b: 1, volume: 1e6 },
    { a: 1, b: 2, volume: 1e6 },
    { a: 3, b: 4, volume: 10 },
  ];

  it('is deterministic and inside [−1, 1]', () => {
    const p1 = forceLayout(6, edges, [5, 4, 3, 2, 1, 0]);
    const p2 = forceLayout(6, edges, [5, 4, 3, 2, 1, 0]);
    expect(p1).toEqual(p2);
    for (const [x, y] of p1) {
      expect(Math.abs(x)).toBeLessThanOrEqual(1.0001);
      expect(Math.abs(y)).toBeLessThanOrEqual(1.0001);
    }
  });

  it('draws linked accounts closer than unlinked ones', () => {
    const p = forceLayout(6, edges);
    const d = (i: number, j: number) => Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1]);
    expect(d(0, 1)).toBeLessThan(d(0, 5));
  });

  it('handles 0 and 1 node and is fast for 33 nodes', () => {
    expect(forceLayout(0, [])).toEqual([]);
    expect(forceLayout(1, [])).toEqual([[0, 0]]);
    const big = [...Array(60).keys()].map((i) => ({ a: i % 33, b: (i * 7 + 3) % 33, volume: i * 1000 }));
    const t0 = performance.now();
    forceLayout(33, big);
    expect(performance.now() - t0).toBeLessThan(500);
  });
});

describe('sankey', () => {
  it('builds seller → security → buyer with rest nodes', () => {
    const trades = [
      tr('a', 'b', 100, { asin: 'STX0000001' }),
      tr('c', 'b', 10, { asin: 'STX0000002' }),
      tr('d', 'e', 1, { asin: 'STX0000003' }),
    ];
    const s = sankey(trades, { STX0000001: 'Erste' }, undefined, 2);
    expect(s.nodes.filter((x) => x.column === 'seller').map((x) => x.label)).toEqual(['A', 'C', 'Übrige Verkäufer (1)']);
    expect(s.nodes.find((x) => x.ref === 'STX0000001')!.label).toBe('Erste');
    const total = (col: string) =>
      s.links.filter((l) => s.nodes[l.source].column === col).reduce((sum, l) => sum + l.value, 0);
    expect(total('seller')).toBe(111);
    expect(total('security')).toBe(111);
  });
});

describe('timeline', () => {
  it('picks 12–30 buckets', () => {
    expect(bucketMs(15 * 60_000)).toBe(60_000);
    expect(bucketMs(60 * 60_000)).toBe(2 * 60_000);
    expect(bucketMs(3 * 3600_000)).toBe(10 * 60_000);
    expect(bucketMs(12 * 3600_000)).toBe(30 * 60_000);
  });

  it('stacks by kind or top securities with a rest', () => {
    const from = 0;
    const to = 15 * 60_000;
    const trades = [
      tr('a', 'b', 5, { date: 30_000 }),
      tr('a', 'b', 7, { date: 90_000, asin: 'BOXXXXXXXX' }),
      tr('a', 'b', 1, { date: 90_000, asin: 'STZZZZZZZZ' }),
    ];
    const byKind = timeline(trades, from, to, 'kind');
    expect(byKind.x).toHaveLength(15);
    expect(byKind.series.map((s) => s.key)).toEqual(['STOCK', 'BOND']);
    expect(byKind.series[0].values[0]).toBe(5);
    expect(byKind.counts[1]).toBe(2);
    const bySec = timeline(trades, from, to, 'security', {}, 1);
    expect(bySec.series.map((s) => s.key)).toEqual(['BOXXXXXXXX', 'rest']);
  });
});

describe('unusual activity', () => {
  it('finds pairs trading one security both ways', () => {
    const r = roundTrips([tr('a', 'b', 10), tr('b', 'a', 10), tr('a', 'b', 10), tr('a', 'c', 5)]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ a: 'a', b: 'b', aToB: 2, bToA: 1, volume: 30 });
  });

  it('finds trades far from the median of the security', () => {
    const t = [tr('a', 'b', 100), tr('a', 'b', 100), tr('a', 'b', 110), tr('c', 'd', 1000)];
    const o = offMarket(t);
    expect(o).toHaveLength(1);
    expect(o[0].trade.seller).toBe('c');
    expect(o[0].deviation).toBeCloseTo(100 / 11 - 1);
    expect(offMarket(t.slice(0, 2))).toEqual([]);
  });

  it('groups transfers by receiver and security, many senders in one group, self-transfers last', () => {
    const t0 = (s: string, b: string, shares = 1) => tr(s, b, 0, { price: 0.01, shares, asin: 'ACALPHCOIN' });
    const g = transferGroups([t0('m1', 'malte'), t0('m2', 'malte'), t0('m3', 'malte', 5), t0('m1', 'malte'), t0('x', 'x'), t0('y', 'y'), t0('a', 'b')]);
    expect(g).toHaveLength(3);
    expect(g[0]).toMatchObject({ to: 'malte', count: 4, shares: 8, self: false });
    expect(g[0].parts.map((p) => p.id)).toEqual(['m1', 'm3', 'm2']);
    expect(g[2]).toMatchObject({ self: true, count: 2 });
    expect(g[2].parts).toHaveLength(2);
  });

  it('splits one account’s transfers into received, sent and own', () => {
    const t0 = (s: string, b: string) => tr(s, b, 0, { price: 0.01 });
    const r = transferSides([t0('m1', 'me'), t0('m1', 'me'), t0('m2', 'me'), t0('me', 'z'), t0('me', 'me2'), t0('q', 'r')], (id) => id === 'me' || id === 'me2');
    expect(r.received.map((l) => [l.id, l.count])).toEqual([['m1', 2], ['m2', 1]]);
    expect(r.received[0].paid).toBe(0);
    expect(r.sent.map((l) => l.id)).toEqual(['z']);
    expect(r.own).toBe(1);
  });

  it('resolves the largest and the busiest accounts', () => {
    const t = [tr('a', 'b', 1000), ...[...Array(5)].map(() => tr('p1', 'p2', 1))];
    const r = accountsToResolve(t, 1);
    expect(r).toHaveLength(2);
    expect(r.some((id) => id === 'a' || id === 'b')).toBe(true);
    expect(r.some((id) => id === 'p1' || id === 'p2')).toBe(true);
  });
});

describe('one account', () => {
  const isMe = (id: string) => id === 'me' || id === 'me2';
  const trades = [
    tr('a', 'me', 100, { asin: 'STX0000001' }),
    tr('b', 'me', 50, { asin: 'STX0000002' }),
    tr('me', 'c', 80, { asin: 'STX0000001' }),
    tr('me', 'me2', 30),
    tr('x', 'y', 999),
  ];

  it('flows from its sources through it to its buyers', () => {
    const d = originSankey(trades, isMe, 'Ich', { STX0000001: 'Erste' });
    expect(d.nodes.map((n) => n.column)).toEqual(['seller', 'seller', 'bought', 'bought', 'self', 'sold', 'buyer']);
    expect(d).toMatchObject({ bought: 150, sold: 80, sellers: 2, buyers: 1, internal: 1 });
    const self = d.nodes.findIndex((n) => n.column === 'self');
    expect(d.links.filter((l) => l.target === self).reduce((s, l) => s + l.value, 0)).toBe(150);
    expect(d.links.filter((l) => l.source === self).reduce((s, l) => s + l.value, 0)).toBe(80);
    expect(d.nodes.find((n) => n.ref === 'STX0000001' && n.column === 'bought')!.label).toBe('Erste');
  });

  it('values transfers at today’s price, leaves out securities without one', () => {
    const t0 = (s: string, b: string, asin: string, shares: number) => tr(s, b, 0, { price: 0.01, volume: shares * 0.01, shares, asin });
    const moved = [t0('m1', 'me', 'ACALPHCOIN', 3), t0('m2', 'me', 'ACALPHCOIN', 1), t0('me', 'z', 'WAXXXXXXXX', 5)];
    const prices: Record<string, number> = { ACALPHCOIN: 25_000 };
    const d = originSankey(moved, isMe, 'Ich', {}, undefined, 8, (t) => (prices[t.asin] ? t.shares * prices[t.asin] : undefined));
    expect(d).toMatchObject({ bought: 100_000, sold: 0, sellers: 2, unvalued: 1 });
  });

  it('prices from the last trade, else the bid', () => {
    expect(priceNow({ lastPrice: { value: 12 }, bidPrice: 10 })).toBe(12);
    expect(priceNow({ lastPrice: null, bidPrice: 10 })).toBe(10);
    expect(priceNow(undefined)).toBeUndefined();
  });

  it('keeps the n largest per column and a rest', () => {
    const many = [...Array(5)].map((_, i) => tr(`s${i}`, 'me', 10 + i));
    const d = originSankey(many, isMe, 'Ich', {}, undefined, 2);
    expect(d.nodes.filter((n) => n.column === 'seller').map((n) => n.label)).toEqual(['S4', 'S3', 'Übrige (3)']);
  });

  it('sums what it bought and sold from others', () => {
    expect(selfTotals(trades, isMe)).toEqual({ bought: 150, sold: 80, counterparties: 3, securities: 2 });
  });

  it('finds all accounts of a person, not of similar names', () => {
    const found = [
      { id: '1', name: 'Malte', privateAccount: true },
      { id: '2', name: 'Malte_Fan', privateAccount: true },
      { id: '3', name: 'Argo (STAD9A0F12) | Malte', privateAccount: false, clearingAccountId: 'bank3' },
      { id: '4', name: 'Mitte (STMJ9RPD4B) | Malte_Fan', privateAccount: false },
    ];
    const r = ownerAccounts(found, 'Malte');
    expect(r.map((a) => a.id)).toEqual(['1', '3']);
    expect(r[1].bank).toBe('bank3');
  });
});

describe('collectStreams', () => {
  const log = (prefix: string, count: number, newest: number, step = 1): SecurityOrderLogEntryView[] =>
    [...Array(count).keys()].map((i) => ({ id: `${prefix}${i}`, date: newest - i * step, price: 1, numberOfShares: 1, volume: 1 }));

  it('merges several logs, each id once', async () => {
    const a = log('a', 3, 100);
    const b = [...log('b', 2, 99), a[0]];
    const r = await collectStreams([async () => a, async () => b], 0, 100, 5);
    expect(r.trades).toHaveLength(5);
    expect(r.complete).toBe(true);
    expect(r.from).toBe(0);
  });

  it('starts the covered span where a cut stream ends', async () => {
    const busy = log('x', 1000, 10_000, 2);
    const r = await collectStreams([async () => busy, async () => log('y', 3, 9_000, 3000)], 0, 10_000, 1);
    expect(r.complete).toBe(false);
    expect(r.from).toBe(10_000 - 999 * 2);
    expect(r.trades.every((t) => t.date >= r.from)).toBe(true);
  });
});
