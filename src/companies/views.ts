/**
 * A stock and its company are one page (/wertpapier/:asin): „Handel“ (price, market, holders, ticket) plus the
 * company views as tabs of the same page. /unternehmen/:asin redirects here (`companyRedirect`).
 *
 * Views `?ansicht=`:
 * - wide:  handel (default) · ueberblick · zahlen · presse · abstimmungen · marketmaker · bank? · erfolge · fuehren?
 * - phone: price (default) · markt · holders · scheine · then the same company views (the trading card is split up)
 *
 * Two company views bundle former tabs; their card head switches the presentation:
 * `?zahlen=entwicklung|einordnung|bilanz`, `?presse=meldungen|chronik`. Old values of `?ansicht=` still land there.
 */

export interface StockView {
  value: string;
  label: string;
  description?: string;
  /** phone-only view: on wide screens it shows its parent (the card sits in „Handel“ there) */
  parent?: string;
}

export const ZAHLEN = [
  { value: 'entwicklung', label: 'Entwicklung' },
  { value: 'einordnung', label: 'Einordnung' },
  { value: 'bilanz', label: 'Bilanz' },
] as const;

export const PRESSE = [
  { value: 'meldungen', label: 'Meldungen' },
  { value: 'chronik', label: 'Chronik' },
] as const;

export type ZahlenView = (typeof ZAHLEN)[number]['value'];
export type PresseView = (typeof PRESSE)[number]['value'];

/** Old `?ansicht=` values → the view that holds them now (the card reads its presentation from the old value too). */
export const LEGACY_VIEWS: Record<string, string> = {
  entwicklung: 'zahlen',
  einordnung: 'zahlen',
  bilanz: 'zahlen',
  chronik: 'presse',
  // old phone links to the market card
  book: 'markt',
  depth: 'markt',
  trades: 'markt',
};

/** The phone views of the trading card (wide screens show them together as „Handel“). */
export const TRADING_PHONE: StockView[] = [
  { value: 'price', label: 'Kurs', description: 'Kursverlauf', parent: 'handel' },
  { value: 'markt', label: 'Markt', description: 'Orderbuch, Markttiefe, Trades', parent: 'handel' },
  { value: 'holders', label: 'Eigner', description: 'Größte Anteilseigner', parent: 'handel' },
  { value: 'scheine', label: 'Scheine', description: 'Optionsscheine auf die Aktie', parent: 'handel' },
];

export function companyViews({ bank, ceo }: { bank: boolean; ceo: boolean }): StockView[] {
  return [
    { value: 'ueberblick', label: 'Überblick', description: 'Kurs gegen Buchwert, Einordnung, Anteilseigner, Termine' },
    { value: 'zahlen', label: 'Zahlen', description: 'Entwicklung, Einordnung unter allen Unternehmen, Bilanz' },
    { value: 'presse', label: 'Presse', description: 'Pressemitteilungen und Chronik' },
    { value: 'abstimmungen', label: 'Abstimmungen', description: 'Laufende Abstimmungen, als CEO bewerben' },
    { value: 'marketmaker', label: 'Market Maker', description: 'Designated Sponsors und betreute Wertpapiere' },
    ...(bank ? [{ value: 'bank', label: 'Bank', description: 'Einlage, Zinsertrag, Kreditrahmen' }] : []),
    { value: 'erfolge', label: 'Erfolge', description: 'Erfolge des Unternehmens' },
    ...(ceo ? [{ value: 'fuehren', label: 'Führen', description: 'Kapitalmaßnahmen, Anleihen, Indizes, Gehalt, Logo …' }] : []),
  ];
}

/**
 * All views of a stock page. Wide: „Handel“ first, the phone-only trading views map to it. Phone: the trading
 * views first (no „Handel“), `handel` maps to „Kurs“ (`price`).
 */
export function stockViews(opts: { bank: boolean; ceo: boolean }, phone: boolean): StockView[] {
  const handel: StockView = { value: 'handel', label: 'Handel', description: 'Kurs, Orderbuch, Anteilseigner' };
  return phone ? [...TRADING_PHONE, ...companyViews(opts)] : [handel, ...TRADING_PHONE, ...companyViews(opts)];
}

export const stockFallback = (phone: boolean) => (phone ? 'price' : 'handel');

export const stockAliases = (phone: boolean): Record<string, string> => (phone ? { ...LEGACY_VIEWS, handel: 'price' } : LEGACY_VIEWS);

/** Presentation of the „Zahlen“ card: `?zahlen=`, else the old `?ansicht=` value, else Entwicklung. */
export function zahlenOf(params: URLSearchParams): ZahlenView {
  for (const v of [params.get('zahlen'), params.get('ansicht')]) {
    const hit = ZAHLEN.find((z) => z.value === v);
    if (hit) return hit.value;
  }
  return 'entwicklung';
}

/** Presentation of the „Presse“ card: `?presse=`, else Chronik for the old `?ansicht=chronik`, else Meldungen. */
export function presseOf(params: URLSearchParams): PresseView {
  const own = PRESSE.find((z) => z.value === params.get('presse'));
  if (own) return own.value;
  return params.get('ansicht') === 'chronik' ? 'chronik' : 'meldungen';
}

/**
 * Change view and parameters in one URL write (several setSearchParams calls in one tick lose all but the last).
 * `undefined` removes a key; the default view and default presentations are never written.
 */
export function withQuery(prev: URLSearchParams, patch: Record<string, string | undefined>, fallback: string): URLSearchParams {
  const next = new URLSearchParams(prev);
  for (const [k, v] of Object.entries(patch)) {
    if (v == null || v === '' || (k === 'ansicht' && v === fallback) || (k === 'zahlen' && v === 'entwicklung') || (k === 'presse' && v === 'meldungen'))
      next.delete(k);
    else next.set(k, v);
  }
  return next;
}

/** Link to a company view of a stock: `companyHref('STX', 'zahlen', { zahlen: 'bilanz' })`. */
export function companyHref(asin: string, view = 'ueberblick', extra: Record<string, string> = {}): string {
  const q = new URLSearchParams({ ansicht: view, ...extra });
  return `/wertpapier/${asin}?${q}`;
}

/**
 * /unternehmen/:asin?… → /wertpapier/:asin?… – keeps every parameter; without a view it opens „Überblick“
 * (whoever follows a company link wants the company). Old views stay as they are: the page reads them.
 */
export function companyRedirect(asin: string, search: string): string {
  const q = new URLSearchParams(search);
  if (!q.get('ansicht')) q.set('ansicht', 'ueberblick');
  return `/wertpapier/${asin}?${q}`;
}
