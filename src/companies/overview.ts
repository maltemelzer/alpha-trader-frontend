// Pure logic for the company overview („Überblick“, /unternehmen/:asin): price against book value
// per share, the bonds the company issued, and what happens next (polls, capital measures,
// dividends, mergers, bond maturities).
import type { CapitalMeasureView, CompanyHistoryPoint, DividendPaymentView, MergerView } from '../api/queries';
import type { HistorizedListingDataView, PricePoint } from '../api/types';
import { withoutSpikes } from '../security/derive';

const DAY = 86_400_000;
const NBSP = String.fromCharCode(0xa0);

export const RANGES = [
  { value: '30T', label: '30 T', days: 30 },
  { value: '90T', label: '90 T', days: 90 },
] as const;
export type RangeKey = (typeof RANGES)[number]['value'];

export interface ValuationSeries {
  /** daily closes (spikes removed), the live price last */
  price: PricePoint[];
  /** book value per share from the daily company snapshot (~18:50) */
  book: PricePoint[];
}

/**
 * Price and book value per share over the last `days`. Closes come from the listing's daily history,
 * the live price is appended when it is newer; token trades at 0,01 € are dropped (`withoutSpikes`).
 */
export function valuationSeries(
  history: Pick<CompanyHistoryPoint, 'date' | 'bookValuePerShare'>[] | undefined,
  daily: Pick<HistorizedListingDataView, 'date' | 'closePrice'>[] | undefined,
  days: number,
  now: number,
  live?: PricePoint | null,
): ValuationSeries {
  const from = now - days * DAY;
  const closes = (daily ?? [])
    .map((d) => ({ value: d.closePrice ?? 0, date: new Date(d.date as string | number).getTime() }))
    .filter((p) => p.value > 0 && p.date >= from);
  const lastClose = closes.length ? closes[closes.length - 1].date : -Infinity;
  const price = withoutSpikes([...closes, ...(live && live.value > 0 && live.date > lastClose ? [live] : [])].sort((a, b) => a.date - b.date));
  // Book value per share has single-day outliers too (Alphakasse 07.09.: 876.628 € between 1 and 2,19 €).
  const book = withoutSpikes(
    (history ?? [])
      .map((h) => ({ value: h.bookValuePerShare ?? NaN, date: Date.parse(h.date) }))
      .filter((p) => Number.isFinite(p.value) && p.value > 0 && p.date >= from)
      .sort((a, b) => a.date - b.date),
  );
  return { price, book };
}

/** Change from the first to the last point in % (undefined with fewer than two points or a zero start). */
export function changePct(points: PricePoint[]): number | undefined {
  if (points.length < 2 || !points[0].value) return undefined;
  return (points[points.length - 1].value / points[0].value - 1) * 100;
}

/** Price-to-book ratio (KBV); undefined when the book value per share is not positive. */
export function priceToBook(price: number | undefined, bookPerShare: number | undefined): number | undefined {
  if (price == null || !bookPerShare || bookPerShare <= 0) return undefined;
  return price / bookPerShare;
}

/** BondView as the company profile carries it in `issuedBonds`. */
export interface IssuedBond {
  listing?: { securityIdentifier: string; name?: string };
  interestRate?: number;
  faceValue?: number;
  /** nominal volume in € */
  volume?: number;
  maturityDate?: number;
}

export interface BondSummary {
  count: number;
  /** nominal volume of all running bonds */
  volume: number;
  /** volume-weighted interest to maturity in % */
  rate?: number;
  nextMaturity?: number;
  /** ASIN of the bond due next */
  nextAsin?: string;
  /** running bonds that mature within the next 24 hours */
  dueToday: number;
}

/** The company's running bonds in one line: how many, how much, at what interest, when the next one is due. */
export function bondSummary(bonds: IssuedBond[] | undefined, now: number): BondSummary {
  const running = (bonds ?? []).filter((b) => (b.maturityDate ?? 0) > now);
  const volume = running.reduce((s, b) => s + (b.volume ?? 0), 0);
  const weighted = running.reduce((s, b) => s + (b.volume ?? 0) * (b.interestRate ?? 0), 0);
  const next = running.reduce<IssuedBond | undefined>((m, b) => (!m || b.maturityDate! < m.maturityDate! ? b : m), undefined);
  return {
    count: running.length,
    volume,
    rate: volume ? weighted / volume : undefined,
    nextMaturity: next?.maturityDate,
    nextAsin: next?.listing?.securityIdentifier,
    dueToday: running.filter((b) => b.maturityDate! <= now + DAY).length,
  };
}

/** The fields of a poll the overview needs (DS Poll). */
export interface PollLike {
  id: string;
  endDate?: number;
  kind?: string;
  capitalIncreaseType?: string;
  acquiringCompany?: unknown;
  dailyWage?: number;
  name?: string;
  company?: unknown;
  numberOfShares?: number;
  price?: number;
  maximalCashVolume?: number;
  approvalVotesPercentage?: number;
  castVotesPercentage?: number;
}

/** Kind of a poll from its fields (same rule as the DS PollCard). */
export function pollKind(p: PollLike): string {
  if (p.kind) return p.kind;
  if (p.capitalIncreaseType) return 'CAPITAL_INCREASE';
  if (p.acquiringCompany) return 'MERGER';
  if (p.dailyWage != null) return 'EMPLOY_CEO';
  if (p.name != null && p.company) return 'CHANGE_NAME';
  if (p.numberOfShares != null && p.price != null) return 'CAPITAL_REDUCTION';
  if (p.maximalCashVolume != null) return 'DIVIDEND_PAYMENT';
  return 'OTHER';
}

export type UpcomingKind = 'poll' | 'increase' | 'reduction' | 'dividend' | 'merger' | 'bond';

export interface Upcoming {
  id: string;
  kind: UpcomingKind;
  /** when it happens (poll: end of voting; measure: start of subscription; dividend/merger: due date) */
  date: number;
  /** end of a running subscription phase */
  until?: number;
  label: string;
  detail?: string;
  href?: string;
}

/**
 * What happens next at this company, soonest first: running polls (until they end), capital
 * increases/reductions (planned or in subscription), accepted dividends and mergers (either side)
 * and the next bond maturity. The global lists hold every company's measures – filtered here.
 */
export function upcoming(
  companyId: string,
  src: {
    polls?: PollLike[];
    increases?: CapitalMeasureView[];
    reductions?: CapitalMeasureView[];
    dividends?: DividendPaymentView[];
    mergers?: MergerView[];
    bonds?: BondSummary;
    pollKinds?: Record<string, string>;
    asin?: string;
  },
  now: number,
): Upcoming[] {
  const out: Upcoming[] = [];
  const kinds = src.pollKinds ?? {};
  for (const p of src.polls ?? []) {
    if (p.endDate == null || p.endDate <= now) continue;
    out.push({
      id: `poll-${p.id}`,
      kind: 'poll',
      date: p.endDate,
      label: `Abstimmung: ${kinds[pollKind(p)] ?? 'Abstimmung'}`,
      detail: p.castVotesPercentage != null ? `${Math.round(p.castVotesPercentage)}${NBSP}% abgestimmt` : undefined,
      href: src.asin ? `/unternehmen/${src.asin}?ansicht=abstimmungen` : undefined,
    });
  }
  const measure = (m: CapitalMeasureView, kind: 'increase' | 'reduction') => {
    if (m.company?.id !== companyId || m.endDate <= now) return;
    out.push({
      id: `${kind}-${m.id}`,
      kind,
      date: m.startDate > now ? m.startDate : m.endDate,
      until: m.startDate > now ? m.endDate : undefined,
      label: `${kind === 'increase' ? 'Kapitalerhöhung' : 'Kapitalherabsetzung'} ${m.startDate > now ? 'beginnt' : 'läuft bis'}`,
      href: '/kapitalmassnahmen?art=kapital',
    });
  };
  for (const m of src.increases ?? []) measure(m, 'increase');
  for (const m of src.reductions ?? []) measure(m, 'reduction');
  for (const d of src.dividends ?? []) {
    if (d.company?.id !== companyId || d.startDate <= now) continue;
    out.push({ id: `dividend-${d.id}`, kind: 'dividend', date: d.startDate, label: 'Gewinnausschüttung', href: '/kapitalmassnahmen?art=dividenden' });
  }
  // Mergers: this company merges into another, or takes others over – all pending takeovers are
  // one entry at the earliest date („Übernimmt carmen66 Inc. und 12 weitere“; Alphakasse had 13).
  const takeovers: MergerView[] = [];
  for (const m of src.mergers ?? []) {
    if (m.startDate <= now) continue;
    if (m.company?.id === companyId)
      out.push({ id: `merger-${m.id}`, kind: 'merger', date: m.startDate, label: `Fusion mit ${m.acquiringCompany?.name ?? '…'}`, href: '/kapitalmassnahmen?art=fusionen' });
    else if (m.acquiringCompany?.id === companyId) takeovers.push(m);
  }
  if (takeovers.length) {
    takeovers.sort((a, b) => a.startDate - b.startDate);
    out.push({
      id: 'takeovers',
      kind: 'merger',
      date: takeovers[0].startDate,
      label: `Übernimmt ${takeovers[0].company?.name ?? '…'}${takeovers.length > 1 ? ` und ${takeovers.length - 1} weitere` : ''}`,
      href: '/kapitalmassnahmen?art=fusionen',
    });
  }
  if (src.bonds?.nextMaturity) {
    out.push({
      id: 'bond-next',
      kind: 'bond',
      date: src.bonds.nextMaturity,
      label: 'Nächste Anleihe fällig',
      detail: src.bonds.dueToday > 1 ? `${src.bonds.dueToday} in 24 Std.` : undefined,
    });
  }
  return out.sort((a, b) => a.date - b.date);
}

