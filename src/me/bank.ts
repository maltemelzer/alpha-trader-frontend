// Account statement analysis for the bank page: every cash transfer log entry gets a sign (seen from
// one account), a category, a German text and a subject (security, company, account); from that come
// the running balance, flows per day and category, the waterfall and the largest items.
import type { CashTransferLogEntry } from '../../vendor/bankiersgruen';
import type { ApiMessage } from '../lib/messages';
import { parseAmount } from '../companies/derive';
import { short } from '../lib/format';

export type CashCategory =
  | 'handel'
  | 'anleihen'
  | 'gehalt'
  | 'zinsen'
  | 'dividenden'
  | 'ueberweisung'
  | 'zentralbank'
  | 'optionsscheine'
  | 'kapital'
  | 'gebuehren'
  | 'sonstiges';

export const CATEGORY_LABEL: Record<CashCategory, string> = {
  handel: 'Wertpapierhandel',
  anleihen: 'Anleihen & Repos',
  gehalt: 'Gehalt',
  zinsen: 'Zinsen',
  dividenden: 'Dividenden',
  ueberweisung: 'Überweisungen',
  zentralbank: 'Zentralbank-Einlage',
  optionsscheine: 'Optionsscheine',
  kapital: 'Kapitalmaßnahmen',
  gebuehren: 'Gebühren',
  sonstiges: 'Sonstiges',
};

/** Short labels for chart axes on the phone. */
export const CATEGORY_SHORT: Record<CashCategory, string> = {
  handel: 'Handel',
  anleihen: 'Anleihen',
  gehalt: 'Gehalt',
  zinsen: 'Zinsen',
  dividenden: 'Dividende',
  ueberweisung: 'Überweis.',
  zentralbank: 'ZB-Einlage',
  optionsscheine: 'Scheine',
  kapital: 'Kapital',
  gebuehren: 'Gebühren',
  sonstiges: 'Sonstiges',
};

export const CATEGORIES = Object.keys(CATEGORY_LABEL) as CashCategory[];

const ASIN = /^[A-Z]{2}[A-Z0-9]{8}$/;

/** Category of a cash log template (the API's English „message“ with „#“ placeholders). */
export function categorize(template: string | undefined): CashCategory {
  const t = (template ?? '').toLowerCase();
  if (!t) return 'sonstiges';
  if (t.includes('shares of')) return 'handel';
  if (t.includes('dividend')) return 'dividenden';
  if (t.includes('salary')) return 'gehalt';
  if (t.includes('fee')) return 'gebuehren';
  if (t.includes('central bank reserves interest') || t.includes('interest')) return 'zinsen';
  if (t.includes('central bank reserves')) return 'zentralbank';
  if (t.includes('repurchase') || t.includes('bond') || t.includes('repo')) return 'anleihen';
  if (t.includes('warrant')) return 'optionsscheine';
  if (t.includes('transfer')) return 'ueberweisung';
  if (/merger|liquidation|founding|capital|company/.test(t)) return 'kapital';
  return 'sonstiges';
}

const num = (s: string | number | null | undefined) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};
/** „14.00“ → „14 Stk.“, „14822096702.00“ → „14,8 Mrd. Stk.“ */
function pieces(s: string | number | null | undefined): string {
  const n = num(s);
  if (n == null) return '? Stk.';
  return `${Math.abs(n) >= 1e6 ? short(n) : n.toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stk.`;
}

/** Security or company named in the message: „Name (ASIN)“ → { name, asin }. */
function named(subs: (string | number | null)[]): { name: string; asin: string } | undefined {
  for (let i = 1; i < subs.length; i++) {
    const s = String(subs[i] ?? '');
    if (ASIN.test(s)) return { name: String(subs[i - 1] ?? s), asin: s };
  }
  return undefined;
}

export interface EntryText {
  /** German description of the booking */
  text: string;
  /** what the money was for or from: security, company, account */
  subject?: string;
  asin?: string;
}

/** German text and subject of one booking; `out` = money left the account. */
export function describe(message: ApiMessage | string | undefined, out: boolean): EntryText {
  const m: ApiMessage = typeof message === 'string' ? { message } : (message ?? {});
  const tpl = m.message ?? '';
  const subs = m.substitutions ?? [];
  const n = named(subs);
  switch (tpl) {
    case '# shares of # (#)':
      return { text: `${out ? 'Kauf' : 'Verkauf'} ${n?.name ?? ''} · ${pieces(subs[0])}`, subject: n?.name, asin: n?.asin };
    case 'Repurchase of # (#): # bonds':
      return { text: `Rückkauf (Repo) ${n?.name ?? ''} · ${pieces(subs[2])}`, subject: n?.name, asin: n?.asin };
    case 'Salary from # (#)':
      return { text: `Gehalt von ${n?.name ?? subs[0] ?? ''}`, subject: n?.name, asin: n?.asin };
    case 'Central bank reserves interest payment: #':
      return { text: 'Zinsen auf die Zentralbank-Einlage', subject: 'Zentralbank' };
    case 'Central Bank Reserves increased':
      return { text: 'Zentralbank-Einlage erhöht', subject: 'Zentralbank' };
    case 'Central Bank Reserves decreased':
      return { text: 'Zentralbank-Einlage gesenkt', subject: 'Zentralbank' };
    case 'Private bank transfer':
      return { text: out ? 'Überweisung gesendet' : 'Überweisung erhalten' };
    case 'Warrant Deposit':
      return { text: 'Sicherheit für Optionsscheine hinterlegt', subject: 'Optionsscheine' };
    case 'Warrant refund':
      return { text: 'Sicherheit für Optionsscheine zurück', subject: 'Optionsscheine' };
    case 'Fund rebalancing fee':
      return { text: 'Gebühr für Fonds-Umschichtung', subject: 'Fondsgebühren' };
    case 'Fund units redemption fee':
      return { text: 'Rücknahmegebühr für Fondsanteile', subject: 'Fondsgebühren' };
    case 'Fund units subscription fee':
      return { text: 'Ausgabegebühr für Fondsanteile', subject: 'Fondsgebühren' };
    case 'Management fee of the fund #':
      return { text: `Verwaltungsgebühr ${subs[0] ?? ''}`.trim(), subject: String(subs[0] ?? 'Fondsgebühren') };
    case 'Fund Creation Fee':
      return { text: 'Gebühr für die Fondsgründung', subject: 'Gründungsgebühren' };
    case 'Index Creation Fee':
      return { text: 'Gebühr für die Indexgründung', subject: 'Gründungsgebühren' };
    case 'Founding a new company called #':
      return { text: `Gründung von ${subs[0] ?? ''}`.trim(), subject: String(subs[0] ?? '') || undefined };
    case 'Payment for merger of # (#) into # (#)':
      return { text: `Fusion: ${subs[0] ?? ''} in ${subs[2] ?? ''}`, subject: n?.name, asin: n?.asin };
    case 'Liquidation of # (#)':
      return { text: `Liquidation ${n?.name ?? subs[0] ?? ''}`, subject: n?.name, asin: n?.asin };
  }
  const fallback = m.filledString ?? tpl;
  return { text: fallback || (out ? 'Ausgang' : 'Eingang'), subject: n?.name, asin: n?.asin };
}

export interface LedgerRow {
  id: string;
  date: number;
  /** signed from the account's view: + in, − out */
  amount: number;
  category: CashCategory;
  text: string;
  /** who or what the booking concerns (for „Größte Posten“) */
  subject: string;
  asin?: string;
  /** the other bank account */
  counterparty?: string;
  /** balance right after this booking */
  balance: number;
}

/** First 8 characters of an account id: „Konto 0784c4be“. */
export const accountLabel = (id: string | undefined, names: Record<string, string> = {}) =>
  id ? (names[id] ?? `Konto ${id.slice(0, 8)}`) : 'Unbekannt';

/**
 * Statement rows of one account, newest first, with the running balance: the current balance
 * minus everything that came after each booking. `names` = own accounts by id.
 */
export function ledger(
  entries: CashTransferLogEntry[],
  accountId: string,
  currentBalance: number,
  names: Record<string, string> = {},
): LedgerRow[] {
  const sorted = [...entries].sort((a, b) => b.date - a.date);
  let balance = currentBalance;
  return sorted.map((e) => {
    const self = e.senderBankAccount === accountId && e.receiverBankAccount === accountId;
    const out = e.senderBankAccount === accountId && !self;
    const amount = self ? 0 : out ? -Math.abs(e.amount) : Math.abs(e.amount);
    const message = typeof e.message === 'string' ? { message: e.message } : (e.message as ApiMessage | undefined);
    const d = describe(message, out);
    const counterparty = out ? e.receiverBankAccount : e.senderBankAccount;
    const category = categorize(message?.message);
    const row: LedgerRow = {
      id: e.id,
      date: e.date,
      amount,
      category,
      text: d.text,
      subject: d.subject ?? (category === 'ueberweisung' ? accountLabel(counterparty, names) : CATEGORY_LABEL[category]),
      asin: d.asin,
      counterparty,
      balance,
    };
    balance -= amount;
    return row;
  });
}

/** Rows since `now − ms` (all when ms is undefined). */
export function inWindow(rows: LedgerRow[], ms: number | undefined, now: number): LedgerRow[] {
  if (ms == null) return rows;
  const from = now - ms;
  return rows.filter((r) => r.date >= from);
}

export interface Totals {
  inflow: number;
  outflow: number;
  net: number;
  count: number;
  /** balance before the oldest row */
  start: number;
  /** balance after the newest row (= current balance) */
  end: number;
}

export function totals(rows: LedgerRow[], currentBalance: number): Totals {
  let inflow = 0;
  let outflow = 0;
  for (const r of rows) {
    if (r.amount > 0) inflow += r.amount;
    else outflow -= r.amount;
  }
  const oldest = rows[rows.length - 1];
  return {
    inflow,
    outflow,
    net: inflow - outflow,
    count: rows.length,
    start: oldest ? oldest.balance - oldest.amount : currentBalance,
    end: rows[0]?.balance ?? currentBalance,
  };
}

export interface CategorySum {
  category: CashCategory;
  inflow: number;
  outflow: number;
  net: number;
  count: number;
}

/** In/out per category, largest turnover first. */
export function byCategory(rows: LedgerRow[]): CategorySum[] {
  const map = new Map<CashCategory, CategorySum>();
  for (const r of rows) {
    const s = map.get(r.category) ?? { category: r.category, inflow: 0, outflow: 0, net: 0, count: 0 };
    if (r.amount > 0) s.inflow += r.amount;
    else s.outflow -= r.amount;
    s.net += r.amount;
    s.count++;
    map.set(r.category, s);
  }
  return [...map.values()].sort((a, b) => b.inflow + b.outflow - (a.inflow + a.outflow));
}

export interface SubjectSum {
  subject: string;
  asin?: string;
  category: CashCategory;
  inflow: number;
  outflow: number;
  net: number;
  count: number;
}

/** Largest items by turnover (security, company, account), at most `max`. */
export function topSubjects(rows: LedgerRow[], max = 8): SubjectSum[] {
  const map = new Map<string, SubjectSum>();
  for (const r of rows) {
    const key = r.asin ?? r.subject;
    const s = map.get(key) ?? { subject: r.subject, asin: r.asin, category: r.category, inflow: 0, outflow: 0, net: 0, count: 0 };
    if (r.amount > 0) s.inflow += r.amount;
    else s.outflow -= r.amount;
    s.net += r.amount;
    s.count++;
    map.set(key, s);
  }
  return [...map.values()].sort((a, b) => b.inflow + b.outflow - (a.inflow + a.outflow)).slice(0, max);
}

export interface FlowBucket {
  /** bucket start (ms) */
  t: number;
  /** signed sums per category: inflows and outflows separately */
  inflow: Partial<Record<CashCategory, number>>;
  outflow: Partial<Record<CashCategory, number>>;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Bucket size: hours for up to two days of data, else days. */
export const bucketSize = (spanMs: number) => (spanMs <= 2 * DAY ? HOUR : DAY);

/** Local start of the bucket (days start at local midnight). */
export function bucketStart(t: number, size: number): number {
  if (size === HOUR) return Math.floor(t / HOUR) * HOUR;
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Inflows and outflows per bucket and category, oldest first. */
export function flowBuckets(rows: LedgerRow[], size: number): FlowBucket[] {
  const map = new Map<number, FlowBucket>();
  for (const r of rows) {
    if (!r.amount) continue;
    const t = bucketStart(r.date, size);
    const b = map.get(t) ?? { t, inflow: {}, outflow: {} };
    const side = r.amount > 0 ? b.inflow : b.outflow;
    side[r.category] = (side[r.category] ?? 0) + Math.abs(r.amount);
    map.set(t, b);
  }
  return [...map.values()].sort((a, b) => a.t - b.t);
}

/** Balance over time, oldest first, starting with the balance before the first row. */
export function balanceLine(rows: LedgerRow[], currentBalance: number, now: number): { date: number; balance: number }[] {
  if (!rows.length) return [];
  const asc = [...rows].reverse();
  const first = asc[0];
  return [
    { date: first.date - 1, balance: first.balance - first.amount },
    ...asc.map((r) => ({ date: r.date, balance: r.balance })),
    { date: Math.max(now, rows[0].date), balance: currentBalance },
  ];
}

/** Colour order for categories in a chart: the `max` largest get chart-1…chart-5, the rest „Sonstige“. */
export function colorOrder(sums: CategorySum[], max = 5): CashCategory[] {
  return sums.slice(0, max).map((s) => s.category);
}

export type Direction = 'alle' | 'ein' | 'aus';

export function filterRows(rows: LedgerRow[], f: { category?: string; direction?: Direction; text?: string }): LedgerRow[] {
  const q = (f.text ?? '').trim().toLowerCase();
  return rows.filter(
    (r) =>
      (!f.category || f.category === 'alle' || r.category === f.category) &&
      (!f.direction || f.direction === 'alle' || (f.direction === 'ein' ? r.amount > 0 : r.amount < 0)) &&
      (!q || r.text.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q) || (r.asin ?? '').toLowerCase().includes(q)),
  );
}

// ---------- Transfer ----------

export interface TransferAccount {
  id: string;
  name: string;
  cash: number;
}

export interface TransferCheck {
  amount: number | null;
  error?: string;
  ok: boolean;
}

/**
 * Validates a transfer: sender and receiver chosen and different, amount a positive German number
 * with at most two decimals, not more than the sender's cash.
 */
export function checkTransfer(from: TransferAccount | undefined, toId: string | undefined, raw: string): TransferCheck {
  const amount = raw.trim() ? parseAmount(raw) : null;
  let error: string | undefined;
  if (raw.trim() && amount == null) error = 'Bitte einen Betrag wie „1.250,50“ oder „2,5 Mio.“ eingeben.';
  else if (amount != null && amount <= 0) error = 'Der Betrag muss über 0 € liegen.';
  else if (amount != null && Math.round(amount * 100) !== Math.round(amount * 1e6) / 1e4)
    error = 'Höchstens zwei Nachkommastellen.';
  else if (amount != null && from && amount > from.cash + 1e-9) error = 'Mehr als das verfügbare Bargeld.';
  const ok = !!from && !!toId && toId !== from.id && amount != null && amount > 0 && !error;
  return { amount, error, ok };
}

/** Largest amount that can be sent: the whole balance, cut to cents. */
export const maxAmount = (cash: number) => Math.max(0, Math.floor(cash * 100 + 1e-6) / 100);
