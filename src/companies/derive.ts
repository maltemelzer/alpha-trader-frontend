// Pure logic for running a company: request building for the CEO's write actions, input parsing,
// wage figures and designated sponsoring (market maker mandates).

/** A write request as the API expects it: spec path template plus path/query parameters. */
export interface WriteRequest {
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  params: { path?: Record<string, string>; query?: Record<string, string | number | boolean> };
}

export type MarketMakerPolicy = 'OPEN' | 'CLOSED';

/**
 * Every write action of this feature. All are query parameters (no body): the logo is a URL, not
 * an upload; the wage is a plain decimal string („2521136126.58“).
 */
export const ceoRequests = {
  /** PUT /api/companies/logo/{companyId}?logoUrl= */
  setLogo: (companyId: string, logoUrl: string): WriteRequest => ({
    method: 'PUT',
    path: '/api/companies/logo/{companyId}',
    params: { path: { companyId }, query: { logoUrl: logoUrl.trim() } },
  }),
  /** DELETE /api/companies/logo/{companyId} */
  removeLogo: (companyId: string): WriteRequest => ({
    method: 'DELETE',
    path: '/api/companies/logo/{companyId}',
    params: { path: { companyId } },
  }),
  /** PUT /api/companies/marketmakerpolicy/{companyId}?policy=OPEN|CLOSED */
  setMarketMakerPolicy: (companyId: string, policy: MarketMakerPolicy): WriteRequest => ({
    method: 'PUT',
    path: '/api/companies/marketmakerpolicy/{companyId}',
    params: { path: { companyId }, query: { policy } },
  }),
  /** PATCH /api/v2/employmentagreements/company/{companyId}?payAutomatically= */
  setPayAutomatically: (companyId: string, payAutomatically: boolean): WriteRequest => ({
    method: 'PATCH',
    path: '/api/v2/employmentagreements/company/{companyId}',
    params: { path: { companyId }, query: { payAutomatically } },
  }),
  /** DELETE /api/v2/employmentagreements/{agreementId} – the CEO steps down. */
  resign: (agreementId: string): WriteRequest => ({
    method: 'DELETE',
    path: '/api/v2/employmentagreements/{agreementId}',
    params: { path: { agreementId } },
  }),
  /** POST /api/v2/employceopolls?companyId=&dailyWage= – the caller asks the shareholders to employ them as CEO. */
  employCeoPoll: (companyId: string, dailyWage: number): WriteRequest => ({
    method: 'POST',
    path: '/api/v2/employceopolls',
    params: { query: { companyId, dailyWage: wageParam(dailyWage) } },
  }),
  /** POST /api/v2/sponsorships?sponsor=&securityIdentifier= – sponsor company takes up a mandate. */
  startSponsorship: (sponsor: string, securityIdentifier: string): WriteRequest => ({
    method: 'POST',
    path: '/api/v2/sponsorships',
    params: { query: { sponsor, securityIdentifier } },
  }),
  /** DELETE /api/v2/sponsorships?sponsor=&securityIdentifier= – sponsor resigns or the issuer's CEO removes it. */
  endSponsorship: (sponsor: string, securityIdentifier: string): WriteRequest => ({
    method: 'DELETE',
    path: '/api/v2/sponsorships',
    params: { query: { sponsor, securityIdentifier } },
  }),
};

/** Plain decimal with at most two places, no grouping: 2521136126.58 → „2521136126.58“. */
export function wageParam(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** The URL a request goes to (method and query included) – for tests and logs. */
export function requestUrl(r: WriteRequest): string {
  let path = r.path;
  for (const [k, v] of Object.entries(r.params.path ?? {})) path = path.replace(`{${k}}`, encodeURIComponent(v));
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(r.params.query ?? {})) q.append(k, String(v));
  const qs = q.toString();
  return `${r.method} ${path}${qs ? `?${qs}` : ''}`;
}

const UNITS: [RegExp, number][] = [
  [/\s*(brd\.?|billiarden?)$/i, 1e15],
  [/\s*(bio\.?|billionen?)$/i, 1e12],
  [/\s*(mrd\.?|milliarden?)$/i, 1e9],
  [/\s*(mio\.?|millionen?)$/i, 1e6],
  [/\s*(tsd\.?|tausend)$/i, 1e3],
];

/**
 * A German amount typed by the player: „1.234,50“, „2,5 Mrd.“, „2500000 €“. Returns null for
 * anything that is not a finite number ≥ 0.
 */
export function parseAmount(raw: string): number | null {
  // \s also matches no-break spaces (U+00A0, U+202F) from copied amounts
  let s = raw.trim().replace(/\s*€$/, '').replace(/\s+/g, ' ').trim();
  let factor = 1;
  for (const [re, f] of UNITS) {
    if (re.test(s)) {
      s = s.replace(re, '');
      factor = f;
      break;
    }
  }
  s = s.replace(/ /g, '');
  if (!/^\d[\d.]*(,\d+)?$/.test(s)) return null;
  const n = Number(s.replace(/\./g, '').replace(',', '.')) * factor;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Why a logo URL cannot be used, or null when it can. */
export function logoUrlError(raw: string): string | null {
  const s = raw.trim();
  if (!s) return 'Gib die Adresse eines Bildes ein.';
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return 'Das ist keine gültige Adresse.';
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'Nur http- und https-Adressen.';
  return null;
}

/** The CEO's wage against the company: per year, as share of the book value, and how long the cash lasts. */
export function wageFigures(dailyWage: number | undefined, bookValue: number | undefined, cash: number | undefined) {
  if (!dailyWage) return { perYear: 0, shareOfBookValue: undefined, daysOfCash: undefined };
  const perYear = dailyWage * 365;
  return {
    perYear,
    shareOfBookValue: bookValue && bookValue > 0 ? (perYear / bookValue) * 100 : undefined,
    daysOfCash: cash != null && cash > 0 ? Math.floor(cash / dailyWage) : 0,
  };
}

// ---------- Designated sponsoring ----------

export type SponsorRating = 'A' | 'B' | 'C' | 'D';

/** SecuritySponsorship as it appears in company and listing profiles. */
export interface Sponsorship {
  listing: { name: string; securityIdentifier: string; type: string };
  designatedSponsor: {
    id: string;
    name: string;
    securityIdentifier?: string;
    securitiesAccountId?: string;
    ceo?: { id?: string; username: string } | null;
    logoUrl?: string | null;
  };
  sponsorRating?: { value?: SponsorRating; dailyVolumeRate?: number } | null;
}

export const SPONSOR_SHARE_MIN = 5;

export const RATINGS: SponsorRating[] = ['A', 'B', 'C', 'D'];

/** A is best: 4 of 4 segments; D 1 of 4; unknown 0. */
export function ratingLevel(r: SponsorRating | undefined): number {
  const i = r ? RATINGS.indexOf(r) : -1;
  return i < 0 ? 0 : RATINGS.length - i;
}

/** Share of the outstanding shares the sponsor quoted per day (0.001 → „0,10 %“). */
export function volumeRateText(rate: number | undefined): string {
  if (rate == null) return '–';
  return `${(rate * 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}

/** Stake of a company in a listing (percent), from the shareholder list; 0 when it holds none. */
export function companyStake(
  shareholders: { company?: { id?: string } | null; shareInPercent?: number }[] | undefined,
  companyId: string,
): number | undefined {
  if (!shareholders) return undefined;
  return shareholders.find((s) => s.company?.id === companyId)?.shareInPercent ?? 0;
}

export interface Eligibility {
  ok: boolean;
  /** the reasons it is not possible (German, for the form) */
  reasons: string[];
}

/**
 * Whether a company may take up a mandate for a listing: at least 5 % of the outstanding shares,
 * the issuer allows market makers, not twice, not for indexes and ETFs. The server decides in the end.
 */
export function sponsorEligibility(o: {
  companyId: string;
  asin: string;
  stake: number | undefined;
  policy: string | undefined;
  sponsored: Sponsorship[];
  /** listing type – indexes and ETFs have no order book a market maker could serve */
  type?: string;
}): Eligibility {
  const reasons: string[] = [];
  if (o.type === 'INDEX' || o.type === 'ETF') reasons.push('Für Indizes und ETFs gibt es keine Market Maker.');
  if (o.sponsored.some((s) => s.listing.securityIdentifier === o.asin && s.designatedSponsor.id === o.companyId))
    reasons.push('Dein Unternehmen betreut dieses Wertpapier bereits.');
  if (o.policy === 'CLOSED') reasons.push('Der Emittent lässt keine Market Maker zu.');
  if (o.stake == null) reasons.push('Anteil wird geladen.');
  else if (o.stake < SPONSOR_SHARE_MIN)
    reasons.push(
      `Dein Unternehmen hält ${o.stake.toLocaleString('de-DE', { maximumFractionDigits: 2 })} %, nötig sind ${SPONSOR_SHARE_MIN} %.`,
    );
  return { ok: reasons.length === 0, reasons };
}
