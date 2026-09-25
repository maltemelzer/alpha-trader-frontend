import { chronicle, highlightBin, historyLane, parseBins, placement, rankRows, usedLanes, type HistoryEntry } from './profile';
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

describe('placement', () => {
  it('reads the decile as upper/lower share', () => {
    expect(placement(10)).toBe('obere 10 %');
    expect(placement(7)).toBe('obere 40 %');
    expect(placement(6)).toBe('obere 50 %');
    expect(placement(5)).toBe('untere 50 %');
    expect(placement(1)).toBe('untere 10 %');
    expect(placement(undefined)).toBe('–');
    expect(placement(0)).toBe('–');
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
    expect(rows[0]).toMatchObject({ label: 'Buchwert', unit: '€', value: 72, decile: 10, highlight: 1, total: 5 });
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
  const theme = { tokens: (n: string) => n, layout: { xaxis: {}, yaxis: {} } } as unknown as Parameters<typeof distributionChart>[0];
  const bins = parseBins(Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`[${i},${i + 1}]`, i === 3 ? 0 : 10 ** (i % 4)])));
  it('highlights the company bin, leaves empty bins out and labels the value above its bar', () => {
    const f = distributionChart(theme, 900, { bins, highlight: 17, value: 17.5, unit: '€' });
    expect(f.data[0].marker.color[17]).toBe('chart-2');
    expect(f.data[0].marker.color[16]).toBe('line-strong');
    expect(f.data[0].y[3]).toBeNull();
    expect(f.layout.annotations[0]).toMatchObject({ x: 17, y: 1, xanchor: 'right', text: '17,5 €' });
  });
  it('thins the axis labels on narrow charts', () => {
    expect(distributionChart(theme, 900, { bins, highlight: 0, value: 0, unit: 'Stk.' }).layout.xaxis.tickvals).toHaveLength(10);
    expect(distributionChart(theme, 340, { bins, highlight: 0, value: 0, unit: 'Stk.' }).layout.xaxis.tickvals).toHaveLength(4);
  });
});

describe('wrapText', () => {
  it('breaks at word boundaries', () => {
    expect(wrapText('eins zwei drei vier', 9)).toBe('eins zwei<br>drei vier');
    expect(wrapText('kurz', 20)).toBe('kurz');
  });
});
