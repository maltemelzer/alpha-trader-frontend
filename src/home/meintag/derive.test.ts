import { describe, expect, it } from 'vitest';
import {
  breadth,
  dayMove,
  dayReason,
  firstSteps,
  greeting,
  mergeHoldings,
  newsAbout,
  pctText,
  relTime,
  sinceBuy,
  todoItems,
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

describe('pctText', () => {
  it('rounds and hides noise', () => {
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

describe('breadth', () => {
  it('counts breadth without transfer spikes', () => {
    expect(breadth(changes([['A', 1], ['B', -2], ['C', NaN], ['D', 3]]))).toEqual({ up: 2, down: 1 });
  });
});

