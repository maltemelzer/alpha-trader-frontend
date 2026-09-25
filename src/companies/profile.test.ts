import {
  chronicle,
  highlightBin,
  historyLane,
  parseBins,
  rankRows,
  roundEdge,
  sharePct,
  standing,
  standingText,
  usedLanes,
  type HistogramView,
  type HistoryEntry,
} from './profile';
import { distributionChart, wrapText } from './charts';

describe('parseBins', () => {
  it('parses „[lo,hi]“ keys, sorts by lower bound and skips malformed keys', () => {
    expect(parseBins({ '[5,38]': 0, '[-27,-1]': 1, '[0,5]': 8627, junk: 3, '[1e3,2e3]': 2 })).toEqual([
      { lo: -27, hi: -1, count: 1 },
      { lo: 0, hi: 5, count: 8627 },
      { lo: 5, hi: 38, count: 0 },
      { lo: 1000, hi: 2000, count: 2 },
    ]);
    expect(parseBins(undefined)).toEqual([]);
  });
});

describe('highlightBin', () => {
  const bins = parseBins({ '[0,5]': 10, '[5,38]': 3, '[38,244]': 1 });
  it('prefers the bin matching highlightRange', () => {
    expect(highlightBin(bins, { highlightValue: 5, highlightRange: { lowerBound: 5, upperBound: 38 } })).toBe(1);
  });
  it('falls back to the bin containing the value, −1 when none', () => {
    expect(highlightBin(bins, { highlightValue: 100 })).toBe(2);
    expect(highlightBin(bins, { highlightValue: 1e6 })).toBe(-1);
    expect(highlightBin(bins, {})).toBe(-1);
  });
});

// Real answers of GET /api/v2/companyhistograms/{id} (25.09.2026).
const LALALAND_BOOK: HistogramView = {
  highlightValue: 15115524.22,
  decile: 7,
  highlightRange: { lowerBound: 10323346, upperBound: 165018908 },
  histogram: {
    '[-26961114,-1686648]': 1, '[-1686648,-105513]': 0, '[-105513,-6600]': 4, '[-6600,-412]': 2, '[-412,-25]': 0, '[-25,-1]': 0,
    '[-1,9]': 31, '[9,157]': 12, '[157,2526]': 64, '[2526,40400]': 886, '[40400,645813]': 4055, '[645813,10323346]': 1320,
    '[10323346,165018908]': 892, '[165018908,2637830632]': 1124, '[2637830632,42165776680]': 519, '[42165776680,674020803575]': 307,
    '[674020803575,10774236345437]': 181, '[10774236345437,172226388579498]': 60, '[172226388579498,2753042347701679]': 20,
    '[2753042347701679,44007438295324087]': 7,
  },
};
const GEORGY_CASHFLOW: HistogramView = {
  highlightValue: 0,
  decile: 1,
  highlightRange: { lowerBound: -9, upperBound: 1 },
  histogram: {
    '[-32826807224240,-1339246822121]': 3, '[-1339246822121,-54637724537]': 2, '[-54637724537,-2229074501]': 28,
    '[-2229074501,-90940337]': 12, '[-90940337,-3710124]': 92, '[-3710124,-151362]': 225, '[-151362,-6174]': 268, '[-6174,-251]': 188,
    '[-251,-9]': 83, '[-9,1]': 7308, '[1,57]': 53, '[57,1432]': 120, '[1432,35119]': 476, '[35119,860841]': 224, '[860841,21100446]': 291,
    '[21100446,517201384]': 56, '[517201384,12677327197]': 38, '[12677327197,310738968491]': 13, '[310738968491,7616645451184]': 3,
    '[7616645451184,186694601615883]': 2,
  },
};
// Outstanding shares: counted over all ~200.000 securities (buildings, bonds, repos …), not companies.
const SHARES_ALL: Record<string, number> = {
  '[0,5]': 100217, '[5,31]': 1, '[31,177]': 35, '[177,999]': 7, '[999,5622]': 89518, '[5622,31622]': 44, '[31622,177827]': 7591,
  '[177827,999999]': 731, '[999999,5623412]': 825, '[5623412,31622776]': 599, '[31622776,177827940]': 310, '[177827940,999999999]': 101,
  '[999999999,5623413251]': 83, '[5623413251,31622776601]': 70, '[31622776601,177827941003]': 451, '[177827941003,999999999999]': 9,
  '[999999999999,5623413251902]': 45, '[5623413251902,31622776601683]': 33, '[31622776601683,177827941003891]': 6,
  '[177827941003891,1000000000000000]': 2,
};
const NB = String.fromCharCode(0xa0);

describe('standing', () => {
  it('splits the distribution at the company bin and narrows the position with the API decile', () => {
    const bins = parseBins(LALALAND_BOOK.histogram);
    const s = standing(bins, highlightBin(bins, LALALAND_BOOK), LALALAND_BOOK.decile)!;
    expect(s.below).toBeCloseTo(6375 / 9485, 4);
    expect(s.same).toBeCloseTo(892 / 9485, 4);
    expect(s.above).toBeCloseTo(2218 / 9485, 4);
    // bin 67,2–76,6 % ∩ decile 7 (60–70 %) → 67,2–70 %
    expect(s.share).toBeCloseTo((6375 / 9485 + 0.7) / 2, 4);
    expect(s.tied).toBe(false);
    expect(standingText(s)).toBe(`mehr als 68${NB}% der Unternehmen`);
  });

  it('reads a crowded bin as a tie instead of the API decile 1 („untere 10 %“)', () => {
    const bins = parseBins(GEORGY_CASHFLOW.histogram);
    const s = standing(bins, highlightBin(bins, GEORGY_CASHFLOW), 1)!;
    expect(s.tied).toBe(true);
    expect(standingText(s)).toBe(`gleichauf mit 77${NB}% der Unternehmen`);
  });

  it('says what 50.000 shares mean – among all securities, not companies', () => {
    const bins = parseBins(SHARES_ALL);
    const s = standing(bins, highlightBin(bins, { highlightValue: 50_000 }), 10)!;
    expect(s.below).toBeCloseTo(189822 / 200678, 4);
    expect(standingText(s, 'securities')).toBe(`mehr als 96${NB}% aller Wertpapiere`);
    expect(standingText(s, 'securities', false)).toBe(`mehr als 96${NB}%`);
  });

  it('falls back to the bin middle when the decile does not fit, and handles the edges', () => {
    const bins = parseBins({ '[0,5]': 50, '[5,10]': 30, '[10,20]': 20 });
    expect(standing(bins, 1, 10)!.share).toBeCloseTo(0.65, 6);
    const low = standing(bins, 0, 1)!;
    expect(low.below).toBe(0);
    expect(standingText({ ...low, tied: false, share: 0.02 })).toBe(`weniger als 98${NB}% der Unternehmen`);
    expect(standingText({ ...low, tied: false, share: 0 })).toBe(`weniger als 99${NB}% der Unternehmen`);
    expect(standing(bins, -1)).toBeUndefined();
    expect(standing([], 0)).toBeUndefined();
    expect(standingText(undefined)).toBe('–');
  });
});

describe('sharePct / roundEdge', () => {
  it('formats shares readably', () => {
    expect(sharePct(0.53)).toBe(`53${NB}%`);
    expect(sharePct(0.004)).toBe(`0,4${NB}%`);
    expect(sharePct(0.996)).toBe(`99,6${NB}%`);
    expect(sharePct(0.0004)).toBe(`<${NB}0,1${NB}%`);
    expect(sharePct(0.9996)).toBe(`>${NB}99,9${NB}%`);
    expect(sharePct(0)).toBe(`0${NB}%`);
    expect(sharePct(1)).toBe(`100${NB}%`);
  });
  it('rounds bin edges to two digits for the axis', () => {
    expect(roundEdge(645813)).toBe(650000);
    expect(roundEdge(10323346)).toBe(10000000);
    expect(roundEdge(999999)).toBe(1000000);
    expect(roundEdge(-1686648)).toBe(-1700000);
    expect(roundEdge(0)).toBe(0);
  });
});

describe('rankRows', () => {
  it('keeps core figures, drops optional ones without value and figures the API did not send', () => {
    const rows = rankRows({
      bookValueHistogram: { highlightValue: 72, decile: 10, histogram: { '[0,5]': 3, '[5,100]': 2 }, highlightRange: { lowerBound: 5, upperBound: 100 } },
      cashFlowHistogram: { highlightValue: 0, decile: 5, histogram: { '[-1,1]': 7 } },
      bondsVolumeHistogram: { highlightValue: 0, decile: 1, histogram: { '[0,5]': 8 } },
      centralBankReservesHistogram: { highlightValue: 25, decile: 10, histogram: { '[0,5]': 8, '[5,30]': 1 } },
    });
    expect(rows.map((r) => r.key)).toEqual(['bookValue', 'cashFlow', 'centralBankReserves']);
    expect(rows[0]).toMatchObject({ label: 'Buchwert', unit: '€', value: 72, decile: 10, highlight: 1, total: 5, population: 'companies' });
    expect(rows[0].standing).toMatchObject({ below: 0.6, same: 0.4 });
    expect(rankRows(undefined)).toEqual([]);
  });
});

describe('chronicle', () => {
  const entries: HistoryEntry[] = [
    {
      id: 'b',
      type: 'COMPANY_CEO_CHANGED',
      date: 2000,
      content: {
        message: 'The CEO # of # with a salary of # was replaced by # with a salary of #',
        substitutions: ['Esteban', 'Lockwood Bennett', '77778.00', 'Esteban', '2521136126.58'],
      },
    },
    {
      id: 'a',
      type: 'COMPANY_LOGO_CHANGED',
      date: 1000,
      content: { message: '# changed the logo of # from # to #', substitutions: ['GST', 'GST Inc.', 'https://a.png', 'https://b.png'] },
    },
    { id: 'c', type: 'ETF_LAUNCHED', date: 3000, content: { message: '# launched the fund #', substitutions: ['Alphakasse SE', 'A&I 500 ETF'] } },
    { id: 'd', type: 'COMPANY_CREATED' },
  ];

  it('sorts oldest first, drops entries without date, translates without logo URLs', () => {
    const ev = chronicle(entries);
    expect(ev.map((e) => e.id)).toEqual(['a', 'b', 'c']);
    expect(ev[0]).toMatchObject({ lane: 'Name & Logo', text: 'GST hat das Logo von GST Inc. geändert.', minor: false });
    expect(ev[1].text).toBe('CEO Esteban von Lockwood Bennett (Gehalt 77.778 €) wurde durch Esteban (Gehalt 2,52 Mrd. €) ersetzt.');
    expect(ev[1].minor).toBe(true);
    expect(ev[2]).toMatchObject({ lane: 'Fonds', text: 'Alphakasse SE hat den Fonds A&I 500 ETF aufgelegt.' });
  });

  it('lists only the lanes in use, in fixed order', () => {
    expect(usedLanes(chronicle(entries))).toEqual(['Fonds', 'CEO', 'Name & Logo']);
  });

  it('maps types to lanes', () => {
    expect(historyLane('BANK_LICENSE_GRANTED')).toBe('Meilensteine');
    expect(historyLane('COMPANY_MERGER')).toBe('Fusionen');
    expect(historyLane('COMPANY_BOND_STOCKS_ISSUED')).toBe('Kapital');
    expect(historyLane('ETF_FROZEN')).toBe('Fonds');
    expect(historyLane('SOMETHING_NEW')).toBe('Sonstiges');
    expect(historyLane(undefined)).toBe('Sonstiges');
  });
});

describe('distributionChart', () => {
  const theme = {
    tokens: (n: string) => (n === 'chart-2' ? '#578ed4' : n),
    layout: { xaxis: {}, yaxis: {} },
  } as unknown as Parameters<typeof distributionChart>[0];
  const bins = parseBins(Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`[${i},${i + 1}]`, i === 3 ? 0 : 10 ** (i % 4)])));
  const total = bins.reduce((s, b) => s + b.count, 0);
  const row = { bins, highlight: 10, value: 10.5, unit: '€' as const, standing: standing(bins, 10) };

  it('plots shares in % on a linear axis: less pale, own bin full, more neutral', () => {
    const f = distributionChart(theme, 900, row);
    expect('type' in f.layout.yaxis).toBe(false);
    expect(f.data[0].y[10]).toBeCloseTo((bins[10].count / total) * 100, 6);
    expect(f.data[0].marker.color[9]).toBe('rgba(87,142,212,0.45)');
    expect(f.data[0].marker.color[10]).toBe('#578ed4');
    expect(f.data[0].marker.color[11]).toBe('line-strong');
    expect(f.layout.shapes[0]).toMatchObject({ x0: 10, x1: 10 });
  });

  it('says how many have less and more next to the marker and labels the value', () => {
    const f = distributionChart(theme, 900, row);
    const texts = f.layout.annotations.map((a: { text: string }) => a.text);
    expect(texts[0]).toMatch(/^← .* weniger$/);
    expect(texts[1]).toMatch(/ mehr →$/);
    expect(texts[2]).toBe(`10,5${String.fromCharCode(0xa0)}€`);
  });

  it('labels bin edges, thinned on narrow charts', () => {
    expect(distributionChart(theme, 1400, row).layout.xaxis.tickvals).toHaveLength(19);
    expect(distributionChart(theme, 1400, row).layout.xaxis.tickvals[0]).toBe(0.5);
    expect(distributionChart(theme, 340, row).layout.xaxis.tickvals.length).toBeLessThan(6);
  });
});

describe('wrapText', () => {
  it('breaks at word boundaries', () => {
    expect(wrapText('eins zwei drei vier', 9)).toBe('eins zwei<br>drei vier');
    expect(wrapText('kurz', 20)).toBe('kurz');
  });
});
