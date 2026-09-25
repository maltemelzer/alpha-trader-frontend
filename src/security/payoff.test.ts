import { parseDe } from '../lib/format';
import {
  betSummary,
  breakEven,
  chartRange,
  dueText,
  maxPayout,
  money,
  movePicks,
  outcome,
  payoffPoints,
  payout,
  quickPicks,
  readTicketDraft,
  scenarioLabels,
  termsOf,
  zoneOf,
  zoneText,
  type Terms,
} from './payoff';

const NB = String.fromCharCode(0xa0);
const clean = (s: string) => s.split(NB).join(' ');

// Real warrants on Alphakasse SE (25.09.2026): call 71,32 / cap 78,452, put 1,78 / cap 1,602, ratio 0,1.
const call: Terms = { type: 'CALL', strike: 71.32, cap: 78.452, ratio: 0.1 };
const put: Terms = { type: 'PUT', strike: 1.78, cap: 1.602, ratio: 0.1 };

describe('termsOf', () => {
  it('reads strike, cap, ratio and type from the API warrant', () => {
    expect(termsOf({ type: 'PUT', underlyingValue: 1.78, underlyingCapValue: 1.602, ratio: 0.1 })).toEqual(put);
    expect(termsOf({ type: 'CALL', underlyingValue: 71.32, ratio: 0.1 })).toEqual({ type: 'CALL', strike: 71.32, cap: undefined, ratio: 0.1 });
  });
  it('needs strike and ratio', () => {
    expect(termsOf({ type: 'CALL', ratio: 0.1 })).toBeUndefined();
    expect(termsOf({ type: 'CALL', underlyingValue: 5 })).toBeUndefined();
    expect(termsOf(undefined)).toBeUndefined();
  });
});

describe('payout', () => {
  it('call: nothing up to the strike, ratio × distance above it, capped', () => {
    expect(payout(call, 60)).toBe(0);
    expect(payout(call, 71.32)).toBe(0);
    expect(payout(call, 75)).toBeCloseTo(0.368, 10);
    expect(payout(call, 78.452)).toBeCloseTo(0.7132, 10);
    expect(payout(call, 200)).toBeCloseTo(0.7132, 10);
  });
  it('put: nothing from the strike up, ratio × distance below it, capped', () => {
    expect(payout(put, 2)).toBe(0);
    expect(payout(put, 1.78)).toBe(0);
    expect(payout(put, 1.7)).toBeCloseTo(0.008, 10);
    expect(payout(put, 1.602)).toBeCloseTo(0.0178, 10);
    expect(payout(put, 0)).toBeCloseTo(0.0178, 10);
  });
  it('without cap: a call is open upwards, a put pays at most the strike', () => {
    const c: Terms = { type: 'CALL', strike: 10, ratio: 1 };
    const p: Terms = { type: 'PUT', strike: 10, ratio: 1 };
    expect(payout(c, 1000)).toBe(990);
    expect(payout(p, 0)).toBe(10);
    expect(payout(p, -5)).toBe(0); // no negative prices
    expect(maxPayout(c)).toBe(Infinity);
    expect(maxPayout(p)).toBe(10);
  });
  it('index warrant with ratio 0,001', () => {
    const idx: Terms = { type: 'CALL', strike: 1000, cap: 1100, ratio: 0.001 };
    expect(payout(idx, 1050)).toBeCloseTo(0.05, 10);
    expect(maxPayout(idx)).toBeCloseTo(0.1, 10);
  });
  it('a cap on the wrong side pays nothing', () => {
    expect(payout({ type: 'CALL', strike: 10, cap: 9, ratio: 1 }, 20)).toBe(0);
  });
});

describe('maxPayout and breakEven', () => {
  it('max payout is ratio × corridor', () => {
    expect(maxPayout(call)).toBeCloseTo(0.7132, 10);
    expect(maxPayout(put)).toBeCloseTo(0.0178, 10);
  });
  it('break-even: strike ± price ÷ ratio', () => {
    expect(breakEven(call, 0.3)).toBeCloseTo(74.32, 10);
    expect(breakEven(put, 0.01)).toBeCloseTo(1.68, 10);
    expect(breakEven(call, 0)).toBe(71.32);
  });
  it('none when even the cap does not pay the price (issuer ask ≈ ratio × strike)', () => {
    expect(breakEven(call, 7.2)).toBeUndefined();
    expect(breakEven(put, 0.18)).toBeUndefined();
    expect(breakEven(call, undefined)).toBeUndefined();
  });
  it('exactly the max payout breaks even at the cap', () => {
    expect(breakEven(call, maxPayout(call))).toBeCloseTo(78.452, 10);
  });
});

describe('zoneOf', () => {
  it('call and put zones', () => {
    expect(zoneOf(call, 70)).toBe('worthless');
    expect(zoneOf(call, 75)).toBe('between');
    expect(zoneOf(call, 80)).toBe('capped');
    expect(zoneOf(put, 1.9)).toBe('worthless');
    expect(zoneOf(put, 1.7)).toBe('between');
    expect(zoneOf(put, 1.5)).toBe('capped');
  });
  it('explains the zone in words', () => {
    expect(clean(zoneText(call, 70))).toBe('nicht über dem Referenzkurs – der Schein verfällt wertlos');
    expect(clean(zoneText(call, 80))).toBe('über dem Cap – mehr zahlt der Schein nicht');
    expect(clean(zoneText(call, 74.17))).toBe('4 % über dem Referenzkurs');
    expect(clean(zoneText(put, 1.7))).toBe('4,5 % unter dem Referenzkurs');
  });
});

describe('outcome', () => {
  it('per warrant, total, cost and profit', () => {
    const o = outcome({ type: 'CALL', strike: 72, cap: 79.2, ratio: 0.1 }, 80.2, 0.7, 1000);
    expect(o.perWarrant).toBeCloseTo(0.72, 10);
    expect(o.total).toBeCloseTo(720, 8);
    expect(o.cost).toBeCloseTo(700, 8);
    expect(o.pl).toBeCloseTo(20, 8);
    expect(o.plPct).toBeCloseTo(2.857, 3);
  });
  it('a worthless warrant loses everything', () => {
    const o = outcome(call, 60, 7.2, 1000);
    expect(o.total).toBe(0);
    expect(o.pl).toBeCloseTo(-7200, 8);
    expect(o.plPct).toBe(-100);
  });
  it('at the issuer ask the best case is still −90 %', () => {
    expect(outcome(call, 90, 7.2, 1).plPct).toBeCloseTo((0.7132 / 7.2 - 1) * 100, 8);
  });
  it('without price: payout only; no negative counts', () => {
    expect(outcome(call, 75, undefined, 10)).toEqual({ perWarrant: expect.closeTo(0.368, 10), total: expect.closeTo(3.68, 10) });
    expect(outcome(call, 75, 0.3, -5).total).toBe(0);
  });
});

describe('payoffPoints', () => {
  it('includes the kinks and is sorted', () => {
    const pts = payoffPoints(call, 60, 90, 10);
    expect(pts.map((p) => p.x)).toContain(71.32);
    expect(pts.map((p) => p.x)).toContain(78.452);
    expect(pts.every((p, i) => i === 0 || p.x > pts[i - 1].x)).toBe(true);
    expect(pts[0].y).toBe(0);
    expect(pts[pts.length - 1].y).toBeCloseTo(0.7132, 10);
  });
  it('empty for an empty range', () => {
    expect(payoffPoints(call, 5, 5)).toEqual([]);
  });
});

describe('chartRange', () => {
  it('covers strike, cap, spot ±10 % and extras with padding', () => {
    const [lo, hi] = chartRange(call, 71.96, [74]);
    expect(lo).toBeLessThan(71.96 * 0.9);
    expect(hi).toBeGreaterThan(79.156);
    expect(lo).toBeGreaterThanOrEqual(0);
  });
  it('ignores missing values', () => {
    const [lo, hi] = chartRange(put, undefined, [undefined, NaN]);
    expect(lo).toBeLessThan(1.602);
    expect(hi).toBeGreaterThan(1.78);
  });
});

describe('quickPicks', () => {
  it('call: −10 %, unchanged, +5 %, cap in % from now', () => {
    const q = quickPicks(call, 71.96);
    expect(q.map((x) => clean(x.label))).toEqual(['−10 %', 'unverändert', '+5 %', 'Cap +9 %']);
    expect(q[0].value).toBeCloseTo(64.764, 6);
    expect(q[3].value).toBe(78.452);
  });
  it('put: cap first (lowest price), then −5 %, unchanged, +10 %', () => {
    const q = quickPicks(put, 1.78);
    expect(q.map((x) => clean(x.label))).toEqual(['Cap −10 %', '−5 %', 'unverändert', '+10 %']);
  });
  it('none without a price now', () => {
    expect(quickPicks(call, undefined)).toEqual([]);
  });
});

describe('money', () => {
  it('German format with enough digits for small amounts', () => {
    expect(clean(money(0.71))).toBe('0,71 €');
    expect(clean(money(0.0178))).toBe('0,0178 €');
    expect(clean(money(0.5))).toBe('0,50 €');
    expect(clean(money(1234.5))).toBe('1.234,50 €');
    expect(clean(money(-7200))).toBe('−7.200,00 €');
    expect(clean(money(0))).toBe('0,00 €');
    expect(clean(money(4_700_000))).toBe('4,7 Mio. €');
    expect(money(Infinity)).toBe('–');
  });
});

describe('dueText', () => {
  const now = new Date(2026, 8, 25, 22, 30).getTime();
  it('today, tomorrow or a date', () => {
    expect(dueText(new Date(2026, 8, 25, 23, 5).getTime(), now)).toBe('heute 23:05');
    expect(dueText(new Date(2026, 8, 26, 13, 26).getTime(), now)).toBe('morgen 13:26');
    expect(dueText(new Date(2026, 8, 28, 9, 0).getTime(), now)).toBe('am 28.9. um 09:00');
  });
});

describe('betSummary', () => {
  const now = new Date(2026, 8, 25, 22, 30).getTime();
  const end = new Date(2026, 8, 26, 13, 26).getTime();
  it('call with reachable break-even', () => {
    const t: Terms = { type: 'CALL', strike: 72, cap: 79.2, ratio: 0.1 };
    expect(clean(betSummary(t, 'Alphakasse SE', { end, now, price: 0.3 }))).toBe(
      'Du wettest, dass Alphakasse SE bis morgen 13:26 über 72,00 € steigt. Höchstens 0,72 € je Schein (ab 79,20 €). Gewinn zum Brief von 0,30 € ab 75,00 €.',
    );
  });
  it('call bought at the issuer ask: a loss even at the cap', () => {
    expect(clean(betSummary(call, 'Alphakasse SE', { end, now, price: 7.2 }))).toBe(
      'Du wettest, dass Alphakasse SE bis morgen 13:26 über 71,32 € steigt. Höchstens 0,71 € je Schein (ab 78,45 €) – zum Brief von 7,20 € selbst dann ein Verlust (−90 %).',
    );
  });
  it('put with a limit', () => {
    expect(clean(betSummary(put, 'Alphakasse SE', { now, price: 0.01, basis: 'Limit' }))).toBe(
      'Du wettest, dass Alphakasse SE unter 1,78 € fällt. Höchstens 0,0178 € je Schein (bis 1,60 €). Gewinn zu deinem Limit von 0,01 € unter 1,68 €.',
    );
  });
  it('without price: only the bet and the maximum', () => {
    expect(clean(betSummary(call, 'X', { now }))).toBe('Du wettest, dass X über 71,32 € steigt. Höchstens 0,71 € je Schein (ab 78,45 €).');
  });
});

describe('readTicketDraft', () => {
  const ticket = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div;
  };
  const seg = (on: string) =>
    `<div role="radiogroup" aria-label="Aktion"><button aria-checked="${on === 'Kaufen'}">Kaufen</button><button aria-checked="${on === 'Verkaufen'}">Verkaufen</button></div>`;
  it('shares and the limit of a buy order', () => {
    const d = readTicketDraft(ticket(`${seg('Kaufen')}<div class="bnk-ot__lim"><input value="0,35"></div><input aria-label="Anteile" value="1.500">`), 7.2, parseDe);
    expect(d).toEqual({ shares: 1500, limit: 0.35 });
  });
  it('a market order has no limit; a sell order ignores it', () => {
    expect(readTicketDraft(ticket(`${seg('Kaufen')}<input aria-label="Anteile" value="20">`), 7.2, parseDe)).toEqual({ shares: 20, limit: undefined });
    expect(
      readTicketDraft(ticket(`${seg('Verkaufen')}<div class="bnk-ot__lim"><input value="9"></div><input aria-label="Anteile" value="20">`), 7.2, parseDe),
    ).toEqual({ shares: 20, limit: undefined });
  });
  it('an amount becomes whole warrants at the limit or the price', () => {
    expect(readTicketDraft(ticket(`${seg('Kaufen')}<input aria-label="Geldbetrag" value="100">`), 7.2, parseDe).shares).toBe(13);
    expect(
      readTicketDraft(ticket(`${seg('Kaufen')}<div class="bnk-ot__lim"><input value="0,5"></div><input aria-label="Geldbetrag" value="100">`), 7.2, parseDe).shares,
    ).toBe(200);
  });
  it('empty or invalid fields give nothing', () => {
    expect(readTicketDraft(ticket(`<input aria-label="Anteile" value="">`), 7.2, parseDe)).toEqual({ shares: undefined, limit: undefined });
    expect(readTicketDraft(ticket(`<input aria-label="Anteile" value="abc">`), 7.2, parseDe).shares).toBeUndefined();
  });
});

describe('movePicks', () => {
  it('five moves around the price now', () => {
    const q = movePicks(100);
    expect(q.map((x) => clean(x.label))).toEqual(['−10 %', '−5 %', 'unverändert', '+5 %', '+10 %']);
    expect(q.map((x) => Math.round(x.value))).toEqual([90, 95, 100, 105, 110]);
    expect(movePicks(undefined)).toEqual([]);
  });
});

describe('scenarioLabels', () => {
  const listing = (a: string) => ({ securityIdentifier: a, name: a, type: 'WARRANT' as const });
  const ws = [
    { type: 'CALL' as const, underlyingValue: 72, underlyingCapValue: 79.2, ratio: 0.1, listing: listing('WAC') },
    { type: 'PUT' as const, underlyingValue: 72, underlyingCapValue: 64.8, ratio: 0.1, listing: listing('WAP') },
    { type: 'CALL' as const, ratio: 0.1, listing: listing('WAX') },
  ];
  it('payout and P/L at the ask per warrant', () => {
    const l = scenarioLabels(ws, 76, (a) => (a === 'WAC' ? 0.2 : a === 'WAP' ? 0.3 : undefined));
    expect(clean(l.WAC.text)).toBe('0,40 € · ▲ +100 %');
    expect(l.WAC.sign).toBe(1);
    expect(clean(l.WAP.text)).toBe('0,00 € · ▼ −100 %');
    expect(l.WAP.sign).toBe(-1);
    expect(l.WAX).toBeUndefined();
  });
  it('without ask only the payout', () => {
    const l = scenarioLabels(ws, 70, () => undefined);
    expect(clean(l.WAP.text)).toBe('0,20 €');
    expect(l.WAP.sign).toBe(0);
  });
});
