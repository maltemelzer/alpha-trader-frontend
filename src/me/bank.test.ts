import {
  balanceLine,
  bucketSize,
  byCategory,
  categorize,
  checkTransfer,
  describe as describeEntry,
  filterRows,
  flowBuckets,
  inWindow,
  ledger,
  maxAmount,
  topSubjects,
  totals,
} from './bank';
import { barLabels, flowText } from './bankCharts';

describe('chart labels', () => {
  it('cuts labels and shows the ASIN where cut labels collide', () => {
    expect(
      barLabels(
        [
          { label: 'Alpha Bank 0.0000% 26/09/2026', asin: 'BOAE7J9U9O' },
          { label: 'Alpha Bank 0.0000% 25/09/2026', asin: 'BOA6TQOBUT' },
          { label: 'Zentralbank' },
        ],
        12,
      ),
    ).toEqual(['BOAE7J9U9O', 'BOA6TQOBUT', 'Zentralbank']);
  });
  it('writes flows with arrow and sign', () => {
    const nb = String.fromCharCode(0xa0);
    expect(flowText(1_234_000)).toBe(`▲ +1,23${nb}Mio.${nb}€`);
    expect(flowText(-300)).toBe(`▼ −300${nb}€`);
    expect(flowText(0)).toBe(`± 0${nb}€`);
  });
});

const ME = 'me-account';
const H = 3_600_000;
const T0 = new Date(2026, 8, 25, 12, 0).getTime();

const trade = (id: string, amount: number, out: boolean, date: number, name = 'AlphaCoins', asin = 'ACALPHCOIN') => ({
  id,
  date,
  amount,
  senderBankAccount: out ? ME : 'other',
  receiverBankAccount: out ? 'other' : ME,
  message: { message: '# shares of # (#)', substitutions: ['10.00', name, asin], filledString: `10.00 shares of ${name} (${asin})` },
});

// newest first, as the API sends them
const entries = [
  trade('t3', 500, false, T0 - 1 * H),
  {
    id: 'x1',
    date: T0 - 2 * H,
    amount: 1000,
    senderBankAccount: ME,
    receiverBankAccount: 'company-acc',
    message: { message: 'Private bank transfer', substitutions: [], filledString: 'Private bank transfer' },
  },
  {
    id: 's1',
    date: T0 - 3 * H,
    amount: 150,
    senderBankAccount: 'company-acc',
    receiverBankAccount: ME,
    message: { message: 'Salary from # (#)', substitutions: ['lmm72 Corp.', 'STLC8EEB75'], filledString: 'Salary from lmm72 Corp. (STLC8EEB75)' },
  },
  trade('t1', 2000, true, T0 - 30 * H),
];

describe('categorize', () => {
  it('maps the templates seen on the server', () => {
    expect(categorize('# shares of # (#)')).toBe('handel');
    expect(categorize('Repurchase of # (#): # bonds')).toBe('anleihen');
    expect(categorize('Salary from # (#)')).toBe('gehalt');
    expect(categorize('Central bank reserves interest payment: #')).toBe('zinsen');
    expect(categorize('Central Bank Reserves increased')).toBe('zentralbank');
    expect(categorize('Private bank transfer')).toBe('ueberweisung');
    expect(categorize('Warrant Deposit')).toBe('optionsscheine');
    expect(categorize('Fund rebalancing fee')).toBe('gebuehren');
    expect(categorize('Management fee of the fund #')).toBe('gebuehren');
    expect(categorize('Payment for merger of # (#) into # (#)')).toBe('kapital');
    expect(categorize('Founding a new company called #')).toBe('kapital');
    expect(categorize('Dividend payment of # (#)')).toBe('dividenden');
    expect(categorize(undefined)).toBe('sonstiges');
    expect(categorize('Something new')).toBe('sonstiges');
  });
});

describe('describe', () => {
  it('names buys and sells with the security', () => {
    const m = { message: '# shares of # (#)', substitutions: ['14.00', 'braindead41 Inc.', 'STSFABCA48'] };
    expect(describeEntry(m, true)).toEqual({ text: 'Kauf braindead41 Inc. · 14 Stk.', subject: 'braindead41 Inc.', asin: 'STSFABCA48' });
    expect(describeEntry(m, false).text).toBe('Verkauf braindead41 Inc. · 14 Stk.');
    const repo = { message: 'Repurchase of # (#): # bonds', substitutions: ['Alpha Bank 0.0000% 25/09/2026', 'BOA6TQOBUT', '31905440494'] };
    expect(describeEntry(repo, false).text).toBe('Rückkauf (Repo) Alpha Bank 0.0000% 25/09/2026 · 31,9\u00a0Mrd. Stk.');
  });
  it('translates fixed texts and falls back to filledString', () => {
    expect(describeEntry({ message: 'Central Bank Reserves increased' }, true).text).toBe('Zentralbank-Einlage erhöht');
    expect(describeEntry({ message: 'Private bank transfer' }, false).text).toBe('Überweisung erhalten');
    expect(describeEntry({ message: 'New # thing', substitutions: ['x'], filledString: 'New x thing' }, false).text).toBe('New x thing');
    expect(describeEntry(undefined, true).text).toBe('Ausgang');
  });
});

describe('ledger', () => {
  const rows = ledger(entries, ME, 10_000, { 'company-acc': 'Meine AG' });
  it('signs from the account and runs the balance backwards', () => {
    expect(rows.map((r) => r.amount)).toEqual([500, -1000, 150, -2000]);
    expect(rows.map((r) => r.balance)).toEqual([10_000, 9_500, 10_500, 10_350]);
  });
  it('names transfer counterparties by own account names', () => {
    expect(rows[1].subject).toBe('Meine AG');
    expect(rows[1].category).toBe('ueberweisung');
    expect(ledger(entries, ME, 0)[1].subject).toBe('Konto company-');
  });
  it('counts a transfer to itself as zero', () => {
    const self = ledger([{ ...entries[1], receiverBankAccount: ME }], ME, 5);
    expect(self[0].amount).toBe(0);
  });

  it('sums totals with the start balance', () => {
    const t = totals(rows, 10_000);
    expect(t).toMatchObject({ inflow: 650, outflow: 3000, net: -2350, count: 4, start: 12_350, end: 10_000 });
    expect(totals([], 7)).toMatchObject({ start: 7, end: 7, count: 0 });
  });

  it('windows by time', () => {
    expect(inWindow(rows, 24 * H, T0).map((r) => r.id)).toEqual(['t3', 'x1', 's1']);
    expect(inWindow(rows, undefined, T0)).toHaveLength(4);
  });

  it('groups by category, largest turnover first', () => {
    const sums = byCategory(rows);
    expect(sums.map((s) => s.category)).toEqual(['handel', 'ueberweisung', 'gehalt']);
    expect(sums[0]).toMatchObject({ inflow: 500, outflow: 2000, net: -1500, count: 2 });
  });

  it('ranks subjects by turnover', () => {
    const top = topSubjects(rows);
    expect(top[0]).toMatchObject({ subject: 'AlphaCoins', asin: 'ACALPHCOIN', inflow: 500, outflow: 2000, count: 2 });
    expect(top.map((s) => s.subject)).toEqual(['AlphaCoins', 'Meine AG', 'lmm72 Corp.']);
  });

  it('buckets flows by hour or day', () => {
    expect(bucketSize(24 * H)).toBe(H);
    expect(bucketSize(5 * 24 * H)).toBe(24 * H);
    const days = flowBuckets(rows, 24 * H);
    expect(days).toHaveLength(2);
    expect(days[1].inflow).toEqual({ handel: 500, gehalt: 150 });
    expect(days[1].outflow).toEqual({ ueberweisung: 1000 });
    expect(days[0].outflow).toEqual({ handel: 2000 });
  });

  it('draws the balance from before the first booking to now', () => {
    const line = balanceLine(rows, 10_000, T0);
    expect(line[0].balance).toBe(12_350);
    expect(line.at(-1)).toEqual({ date: T0, balance: 10_000 });
    expect(line.map((p) => p.date)).toEqual([...line.map((p) => p.date)].sort((a, b) => a - b));
    expect(balanceLine([], 1, T0)).toEqual([]);
  });

  it('filters by category, direction and text', () => {
    expect(filterRows(rows, { category: 'handel' }).map((r) => r.id)).toEqual(['t3', 't1']);
    expect(filterRows(rows, { direction: 'ein' }).map((r) => r.id)).toEqual(['t3', 's1']);
    expect(filterRows(rows, { direction: 'aus', text: 'meine' }).map((r) => r.id)).toEqual(['x1']);
    expect(filterRows(rows, { text: 'acalph' })).toHaveLength(2);
    expect(filterRows(rows, { category: 'alle', direction: 'alle', text: '' })).toHaveLength(4);
  });
});

describe('checkTransfer', () => {
  const from = { id: 'a', name: 'Privatkonto', cash: 1234.5 };
  it('accepts a valid transfer in German format', () => {
    expect(checkTransfer(from, 'b', '1.000,50')).toEqual({ amount: 1000.5, error: undefined, ok: true });
    expect(checkTransfer({ ...from, cash: 5e6 }, 'b', '2,5 Mio.').amount).toBe(2_500_000);
  });
  it('explains what is wrong', () => {
    expect(checkTransfer(from, 'b', 'abc').error).toMatch(/Betrag/);
    expect(checkTransfer(from, 'b', '0').error).toMatch(/über 0/);
    expect(checkTransfer(from, 'b', '1,005').error).toMatch(/zwei Nachkommastellen/);
    expect(checkTransfer(from, 'b', '2.000').error).toMatch(/verfügbar/);
  });
  it('needs a different receiver and an amount', () => {
    expect(checkTransfer(from, 'a', '10').ok).toBe(false);
    expect(checkTransfer(from, undefined, '10').ok).toBe(false);
    expect(checkTransfer(from, 'b', '').ok).toBe(false);
    expect(checkTransfer(from, 'b', '').error).toBeUndefined();
    expect(checkTransfer(undefined, 'b', '10').ok).toBe(false);
  });
  it('cuts the maximum to cents', () => {
    expect(maxAmount(993113.489)).toBe(993113.48);
    expect(maxAmount(-3)).toBe(0);
  });
});
