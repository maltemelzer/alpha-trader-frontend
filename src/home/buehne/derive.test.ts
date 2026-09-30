import { describe, expect, it } from 'vitest';
import {
  HOUR,
  MIN,
  biggestTrade,
  countdown,
  eventScenes,
  followScene,
  moverScenes,
  newsScenes,
  paceBars,
  programme,
  reasonOf,
  stageGeometry,
  stagePoints,
  tenderScene,
  tradeScene,
  usableRef,
  atText,
  withoutBlips,
  breakingNews,
  pullQuote,
  accountLabel,
  lastClose,
  withClose,
  calmLine,
  sinceClose,
  stripLead,
  thinDots,
  type MarketLine,
  type NewsInput,
  type Scene,
} from './derive';

const NOW = 1_790_000_000_000;
const line = (asin: string, change: number, volume: number): MarketLine => ({ asin, name: asin, type: 'STOCK', price: 10, change, volume });
const trade = (asin: string, price: number, shares: number, date: number, id = `${asin}-${date}`) => ({
  id,
  securityIdentifier: asin,
  price,
  numberOfShares: shares,
  volume: price * shares,
  date,
});

describe('moverScenes', () => {
  it('ranks move × turnover, not the move alone', () => {
    const s = moverScenes([line('STSMALL', 60, 20_000), line('STBIG', 12, 5e9)]);
    expect(s.map((x) => x.id)).toEqual(['mover-STBIG', 'mover-STSMALL']);
    expect(s[0].kind === 'mover' && s[0].rank).toBe(0);
  });

  it('leaves out spot-price jumps, no turnover and no move', () => {
    const s = moverScenes([line('STSPIKE', 4000, 1e9), line('STTHIN', 50, 500), line('STFLAT', 0, 1e9), { ...line('STNONE', 5, 1e9), volume: undefined }]);
    expect(s).toEqual([]);
  });

  it('lifts the player’s own positions', () => {
    const plain = moverScenes([line('STA', 10, 1e8), line('STB', 10, 1e8)]);
    const mine = moverScenes([line('STA', 10, 1e8), line('STB', 10, 1e8)], [{ asin: 'STB', shares: 10, value: 100 }]);
    expect(plain[0].score).toBeCloseTo(plain[1].score);
    expect(mine[0].id).toBe('mover-STB');
    expect(mine[0].score).toBeGreaterThan(plain[0].score);
  });

  it('keeps each security once (it may be in both lists)', () => {
    expect(moverScenes([line('STA', 10, 1e8), line('STA', 10, 1e8)])).toHaveLength(1);
  });
});

describe('biggestTrade / tradeScene', () => {
  it('takes the largest stock trade, never bonds, coins or transfers', () => {
    const t = biggestTrade(
      [
        trade('BOXXXXXXXX', 100, 1e9, NOW),
        trade('ACALPHCOIN', 10, 1e9, NOW),
        trade('STAAAAAAAA', 0.01, 1e12, NOW),
        trade('STBBBBBBBB', 5, 1e6, NOW),
        trade('STCCCCCCCC', 5, 2e6, NOW - 20 * MIN),
      ],
      NOW - 10 * MIN,
    );
    expect(t?.asin).toBe('STBBBBBBBB');
  });

  it('fades with age and ignores small trades', () => {
    const t = biggestTrade([trade('STB', 5, 1e8, NOW)], 0)!;
    const fresh = tradeScene(t, NOW)!;
    const old = tradeScene(t, NOW + 20 * MIN)!;
    expect(fresh.score).toBeGreaterThan(old.score);
    expect(tradeScene({ ...t, volume: 50_000 }, NOW)).toBeUndefined();
  });
});

describe('newsScenes', () => {
  const news = (id: string, age: number, likes = 0): NewsInput => ({ id, title: id, text: 'Text', date: NOW - age, likes, comments: 0 });
  it('keeps the three newest, pinned, freshest first', () => {
    const s = newsScenes([news('alt', 10 * HOUR), news('neu', 5 * MIN), news('uralt', 30 * HOUR), news('mittel', 2 * HOUR)], NOW);
    expect(s.map((x) => x.id)).toEqual(['news-neu', 'news-mittel', 'news-alt']);
    expect(s.every((x) => x.pinned)).toBe(true);
  });
  it('counts reactions a little', () => {
    const [a, b] = newsScenes([news('still', HOUR), news('laut', HOUR, 5)], NOW);
    expect(a.id).toBe('news-laut');
    expect(a.score - b.score).toBeLessThanOrEqual(0.1);
  });
  it('puts breaking news above a strong move', () => {
    const [n] = newsScenes([news('eilt', 10 * MIN)], NOW);
    const [m] = moverScenes([line('STBIG', 60, 1e11)]);
    expect(n.score).toBeGreaterThan(m.score);
  });
  it('finds breaking news the running programme lacks', () => {
    const [n] = newsScenes([news('eilt', 10 * MIN)], NOW);
    const [old] = newsScenes([news('alt', 2 * HOUR)], NOW);
    expect(breakingNews([n, old], [old], NOW)?.id).toBe('news-eilt');
    expect(breakingNews([n, old], [n, old], NOW)).toBeUndefined();
    expect(breakingNews([old], [], NOW)).toBeUndefined();
  });
});

describe('pullQuote / accountLabel', () => {
  it('takes the longest sentence after the excerpt', () => {
    const a = 'Kurz. ' + 'Erster langer Satz, der im Auszug schon zu lesen ist und nicht noch einmal. ';
    const text = a + 'Ein zweiter Satz, der weiter hinten im Artikel steht und etwas Neues sagt. Noch ein Satz mit genug Länge für ein Zitat.';
    expect(pullQuote(text, 60)).toBe('Ein zweiter Satz, der weiter hinten im Artikel steht und etwas Neues sagt.');
    expect(pullQuote('Nur ein einziger Satz mit genug Zeichen für ein Zitat hier.', 220)).toBe('Nur ein einziger Satz mit genug Zeichen für ein Zitat hier.');
    expect(pullQuote('Zu kurz.')).toBeUndefined();
  });
  it('names accounts for people', () => {
    expect(accountLabel('Prime Market Making (STPRIMEMM1) | Malte')).toBe('Prime Market Making');
    expect(accountLabel('carlos')).toBe('carlos');
    expect(accountLabel('ef-sec-acc-1234')).toBe('ETF-Fonds');
    expect(accountLabel('')).toBeUndefined();
  });
});

describe('tenderScene / eventScenes', () => {
  it('grows towards the end of bidding and is gone after it', () => {
    const far = tenderScene({ asin: 'ITI', endDate: NOW + 10 * HOUR }, 1.2, NOW)!;
    const near = tenderScene({ asin: 'ITI', endDate: NOW + 10 * MIN }, 1.2, NOW)!;
    expect(near.score).toBeGreaterThan(far.score);
    expect(near.score).toBeGreaterThan(0.6);
    expect(tenderScene({ asin: 'ITI', endDate: NOW - 1 }, 1.2, NOW)).toBeUndefined();
  });
  it('keeps upcoming events of the next two days, soonest first', () => {
    const e = (id: string, dt: number) => ({ id, kind: 'dividend' as const, company: id, date: NOW + dt });
    const s = eventScenes([e('spaet', 30 * HOUR), e('bald', HOUR), e('vorbei', -HOUR), e('fern', 3 * 24 * HOUR)], NOW);
    expect(s.map((x) => x.id)).toEqual(['event-dividend-bald', 'event-dividend-spaet']);
  });
});

describe('programme', () => {
  const s = (id: string, kind: Scene['kind'], score: number) => ({ id, kind, score }) as Scene;
  it('sorts by relevance and caps each kind', () => {
    const p = programme([s('a', 'mover', 0.9), s('b', 'mover', 0.8), s('c', 'mover', 0.7), s('d', 'news', 0.5), s('e', 'mover', 0.95)], 7, 3);
    expect(p.map((x) => x.id)).toEqual(['e', 'a', 'b', 'd']);
  });
  it('gives every kind a place before the rest fills up', () => {
    const p = programme([s('a', 'mover', 0.9), s('b', 'mover', 0.8), s('c', 'mover', 0.7), s('t', 'tender', 0.1)], 3);
    expect(p.map((x) => x.id)).toEqual(['a', 'b', 't']);
  });
  it('keeps pinned scenes even when others score higher', () => {
    const pin = { ...s('n', 'news', 0.1), pinned: true } as Scene;
    const p = programme([s('a', 'mover', 0.9), s('b', 'trade', 0.8), pin], 2);
    expect(p.map((x) => x.id)).toEqual(['a', 'n']);
  });
  it('stops at the maximum', () => {
    expect(programme([s('a', 'news', 1), s('b', 'tender', 1), s('c', 'trade', 1)], 2)).toHaveLength(2);
  });
});

describe('followScene', () => {
  const s = (id: string) => ({ id, kind: 'news', score: 0 }) as Scene;
  it('keeps the running scene when the list reorders', () => {
    expect(followScene([s('x'), s('a'), s('b')], 'a', 0)).toBe(1);
  });
  it('falls back to the same place, within bounds', () => {
    expect(followScene([s('x'), s('y')], 'gone', 1)).toBe(1);
    expect(followScene([s('x')], 'gone', 4)).toBe(0);
    expect(followScene([], 'gone', 4)).toBe(0);
  });
});

describe('words', () => {
  it('says why a mover is on stage', () => {
    const [m] = moverScenes([line('STA', -18.4, 3.2e6)]);
    expect(reasonOf(m, NOW)).toBe('Bricht seit dem letzten Tagesschluss um 18 % ein – bei 3,2 Mio. € Umsatz in 24 Std. die stärkste Bewegung mit echtem Handel.');
    const [own] = moverScenes([line('STA', 4.25, 3.2e6)], [{ asin: 'STA', shares: 1200, value: 12_000 }]);
    expect(reasonOf(own, NOW)).toBe('Steigt seit dem letzten Tagesschluss um 4,3 % – du hältst 1.200 Stück im Wert von 12 Tsd. €.');
  });
  it('shortens long article texts at a word', () => {
    const [n] = newsScenes([{ id: 'n', title: 't', text: 'Wort '.repeat(80), date: NOW, likes: 0, comments: 0 }], NOW);
    const r = reasonOf(n, NOW);
    expect(r.length).toBeLessThanOrEqual(222);
    expect(r.endsWith('Wort …')).toBe(true);
  });
  it('counts down', () => {
    expect(countdown(42 * MIN)).toBe('42 Min.');
    expect(countdown(3 * HOUR + 12 * MIN)).toBe('3 Std. 12 Min.');
    expect(countdown(26 * HOUR)).toBe('1 T 2 Std.');
  });
});

describe('stage chart', () => {
  it('drops transfers and single spikes, keeps the last day or the last trades', () => {
    const trades = [
      trade('STA', 10, 1, NOW - 3 * HOUR),
      trade('STA', 0.01, 1, NOW - 2 * HOUR),
      trade('STA', 10.5, 1, NOW - 90 * MIN),
      trade('STA', 900, 1, NOW - HOUR),
      trade('STA', 11, 1, NOW - 30 * MIN),
    ];
    expect(stagePoints(trades, NOW, 24 * HOUR, 2).map((p) => p.price)).toEqual([10, 10.5, 11]);
    expect(stagePoints(trades, NOW, 45 * MIN, 2).map((p) => p.price)).toEqual([10.5, 11]);
  });

  it('maps time to x and price to y as a step line', () => {
    const pts = stagePoints([trade('STA', 10, 1, NOW), trade('STA', 20, 1, NOW + MIN)], NOW + MIN, HOUR, 1);
    const g = stageGeometry(pts, { width: 110, height: 120, pad: [10, 10, 10, 0] });
    expect(g.dots[0].x).toBe(0);
    expect(g.dots[1].x).toBe(100);
    expect(g.dots[0].y).toBeGreaterThan(g.dots[1].y);
    expect(g.line).toBe(`M0,${g.dots[0].y}H100V${g.dots[1].y}`);
    expect(g.last?.price).toBe(20);
  });

  it('centres a flat line', () => {
    const pts = stagePoints([trade('STA', 10, 1, NOW), trade('STA', 10, 1, NOW + MIN)], NOW, HOUR, 1);
    const g = stageGeometry(pts, { width: 100, height: 100, pad: [0, 0, 0, 0] });
    expect(g.dots[0].y).toBeCloseTo(50);
  });

  it('counts trades per minute for the pace bars', () => {
    const bars = paceBars([trade('STA', 1, 1, NOW - 30_000), trade('STA', 1, 1, NOW - 90_000), trade('STA', 0.01, 1, NOW)], NOW, 3 * MIN);
    expect(bars).toEqual([0, 1, 1]);
  });
});

describe('usableRef', () => {
  const pts = [10, 11, 10.5].map((price, i) => ({ id: String(i), date: i, price, volume: 1 }));
  it('keeps a close near the trades and drops a far one', () => {
    expect(usableRef(pts, 11.8)).toBe(11.8);
    expect(usableRef(pts, 19)).toBeUndefined();
    expect(usableRef([], 10)).toBeUndefined();
  });
});

describe('atText', () => {
  it('names the day and the time', () => {
    const now = new Date(2026, 8, 30, 15, 0).getTime();
    expect(atText(new Date(2026, 8, 30, 20, 59).getTime(), now)).toBe('heute um 20:59\u00a0Uhr');
    expect(atText(new Date(2026, 9, 1, 9, 5).getTime(), now)).toBe('morgen um 09:05\u00a0Uhr');
    expect(atText(new Date(2026, 9, 3, 14, 0).getTime(), now)).toBe('am 3.10. um 14:00\u00a0Uhr');
  });
});

describe('withoutBlips', () => {
  it('drops a single snapshot between two equal ones, keeps real steps', () => {
    const p = (price: number) => ({ price });
    expect(withoutBlips([1, 1, 0.5, 1, 1, 2, 2].map(p)).map((x) => x.price)).toEqual([1, 1, 1, 1, 2, 2]);
  });
});

describe('close in front of the trades', () => {
  const pt = (date: number, price: number) => ({ id: String(date), date, price, volume: 1 });
  it('finds the latest close before now (ISO dates)', () => {
    const c = lastClose(
      [
        { date: new Date(NOW - 30 * HOUR).toISOString(), closePrice: 19 },
        { date: new Date(NOW - 6 * HOUR).toISOString(), closePrice: 18 },
        { date: new Date(NOW + HOUR).toISOString(), closePrice: 1 },
        { date: new Date(NOW - 2 * HOUR).toISOString(), closePrice: 0 },
      ],
      NOW,
    );
    expect(c?.price).toBe(18);
    expect(c?.close).toBe(true);
  });
  it('puts the close first and drops older trades', () => {
    const close = { id: 'c', date: NOW - 6 * HOUR, price: 19, volume: 0, close: true };
    expect(withClose([pt(NOW - 8 * HOUR, 20), pt(NOW - HOUR, 7)], close).map((p) => p.price)).toEqual([19, 7]);
    expect(withClose([pt(NOW - 8 * HOUR, 20)], close).map((p) => p.price)).toEqual([20]);
  });
  it('runs time linear when the trades reach back to the close', () => {
    const close = { id: 'c', date: NOW - 60 * MIN, price: 20, volume: 0, close: true };
    const g = stageGeometry(withClose([pt(NOW - 58 * MIN, 12), pt(NOW - 30 * MIN, 11), pt(NOW, 10)], close), { width: 60, height: 100, pad: [0, 0, 0, 0] });
    expect(g.gathered).toBe(false);
    expect(g.dots.map((d) => d.x)).toEqual([2, 30, 60]);
  });
  it('keeps each trade once', () => {
    const t = trade('STA', 10, 1, NOW, 'x');
    expect(stagePoints([t, t, trade('STA', 11, 1, NOW + 1)], NOW, HOUR, 1)).toHaveLength(2);
  });
  it('drops runs of spot prices', () => {
    const trades = [10, 10.2, 0.02, 0.02, 10.1, 10.3, 10.2].map((p, i) => trade('STA', p, 1, NOW - (10 - i) * MIN));
    expect(stagePoints(trades, NOW, HOUR, 2).map((p) => p.price)).toEqual([10, 10.2, 10.1, 10.3, 10.2]);
  });
  it('joins close and first trade with a dashed gap', () => {
    const close = { id: 'c', date: NOW - 6 * HOUR, price: 20, volume: 0, close: true };
    const g = stageGeometry(withClose([pt(NOW - HOUR, 10), pt(NOW, 10)], close), { width: 100, height: 100, pad: [0, 0, 0, 0] });
    expect(g.gathered).toBe(true);
    expect(g.close?.x).toBe(0);
    expect(g.gap).toMatch(/^M0,/);
    expect(g.dots.map((d) => d.x)).toEqual([28, 100]);
  });
  it('measures a mover against the drawn close', () => {
    const [m] = moverScenes([{ ...line('STA', -66, 1e9), price: 6 }]);
    const c = sinceClose(m, { id: 'c', date: NOW, price: 12, volume: 0, close: true });
    expect(c.kind === 'mover' && c.line.change).toBeCloseTo(-50);
    expect(c.kind === 'mover' && c.line.basis).toBe('close');
    const none = sinceClose(m, undefined);
    expect(none.kind === 'mover' && [none.line.change, none.line.basis]).toEqual([-66, 'server']);
    const wait = sinceClose(m, undefined, false);
    expect(wait.kind === 'mover' && wait.line.basis).toBe('pending');
  });
  it('calms bid/ask ping-pong', () => {
    expect(calmLine([2.1, 2.11, 2.1, 2.11, 2.1, 2.11, 2.1])).toEqual([2.1, 2.1, 2.1, 2.1, 2.1, 2.1, 2.1]);
    expect(calmLine([1, 1, 1, 5, 5, 5, 5])).toEqual([1, 1, 1, 5, 5, 5, 5]);
    expect(calmLine([100, 100.2, 102, 102.1])).toEqual([100, 100, 102, 102]);
    expect(calmLine([2.1, 2.12, 2.1, 2.12, 2.1, 2.14, 2.1, 2.12, 2.1, 2.1, 2.12])).toEqual(Array(11).fill(2.1));
  });
});

describe('stripLead / thinDots', () => {
  it('drops a bold lead-in paragraph, keeps everything else', () => {
    expect(stripLead('<p><strong>Unterzeile</strong></p>\n<p>Erster Satz.</p>')).toBe('\n<p>Erster Satz.</p>');
    expect(stripLead('<h2>Kopf</h2><p>Text</p>')).toBe('<p>Text</p>');
    expect(stripLead('<p><strong>Fett</strong> und normal.</p>')).toBe('<p><strong>Fett</strong> und normal.</p>');
    expect(stripLead('<p><strong>Nur das</strong></p>')).toBe('<p><strong>Nur das</strong></p>');
  });
  it('keeps the largest dot per column, the kept ones and the last', () => {
    const dots = Array.from({ length: 10 }, (_, i) => ({ id: String(i), x: i, y: 0, r: i === 4 ? 9 : 1 }));
    const t = thinDots(dots, ['7'], 5, 10);
    expect(t.map((d) => d.id)).toEqual(['4', '7', '9']);
    expect(thinDots(dots, [], 20)).toBe(dots);
  });
});
