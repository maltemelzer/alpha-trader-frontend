// Real estate market: buildings grouped by size, price per m², offers.
import type { MarketRow } from '../api/queries';
import type { RealEstateOffer } from '../../vendor/bankiersgruen';
import { buildingSize } from '../security/derive';

/** Sizes the game builds (m²); ~11.000 buildings each. Other sizes found in the data are added. */
export const BUILDING_SIZES = [150, 1200, 5000, 7500] as const;

export interface EstateSize {
  size: number;
  /** buildings of this size in the recently traded list */
  traded: number;
  /** trades of these buildings (sum of `count`) */
  trades: number;
  /** median last price per m² */
  medianPerSqm?: number;
  offers: number;
  /** cheapest ask of the size, per m² and in total */
  cheapestPerSqm?: number;
  cheapestAsk?: number;
  cheapestAsin?: string;
}

const median = (xs: number[]) => {
  if (!xs.length) return undefined;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export const sizeOfRow = (r: MarketRow) => buildingSize(r.listing.name);

/** Key figures per size (the known sizes always, in size order). */
export function estateBySize(rows: MarketRow[]): EstateSize[] {
  const sizes = new Set<number>(BUILDING_SIZES);
  for (const r of rows) {
    const s = sizeOfRow(r);
    if (s) sizes.add(s);
  }
  return [...sizes]
    .sort((a, b) => a - b)
    .map((size) => {
      const own = rows.filter((r) => sizeOfRow(r) === size);
      const perSqm = own.map((r) => r.lastPrice?.value ?? 0).filter((p) => p > 0).map((p) => p / size);
      const offers = own.filter((r) => r.askPrice != null && r.askPrice > 0 && (r.askSize ?? 0) > 0);
      const cheapest = offers.reduce<MarketRow | undefined>((best, r) => (!best || r.askPrice! < best.askPrice! ? r : best), undefined);
      return {
        size,
        traded: own.length,
        trades: own.reduce((n, r) => n + (r.count ?? 0), 0),
        medianPerSqm: median(perSqm),
        offers: offers.length,
        cheapestAsk: cheapest?.askPrice ?? undefined,
        cheapestPerSqm: cheapest ? cheapest.askPrice! / size : undefined,
        cheapestAsin: cheapest?.listing.securityIdentifier,
      };
    });
}

/** Buildings with an ask as DS.RealEstateList offers, optionally of one size. */
export function estateOffers(rows: MarketRow[], size?: number): RealEstateOffer[] {
  return rows
    .filter((r) => r.askPrice != null && r.askPrice > 0 && (r.askSize ?? 0) > 0 && (!size || sizeOfRow(r) === size))
    .map((r) => ({
      listing: r.listing as RealEstateOffer['listing'],
      price: { askPrice: r.askPrice ?? undefined, askSize: r.askSize ?? undefined, bidPrice: r.bidPrice ?? undefined },
    }));
}

export interface EstateDot {
  asin: string;
  name: string;
  size: number;
  perSqm: number;
  trades: number;
  /** ask per m² when on offer */
  askPerSqm?: number;
}

/** One dot per building with a last price: price per m², trade count for the dot area. */
export function estateDots(rows: MarketRow[]): EstateDot[] {
  return rows.flatMap((r) => {
    const size = sizeOfRow(r);
    const last = r.lastPrice?.value;
    if (!size || !last || last <= 0) return [];
    return [
      {
        asin: r.listing.securityIdentifier,
        name: r.listing.name,
        size,
        perSqm: last / size,
        trades: r.count ?? 1,
        askPerSqm: r.askPrice && (r.askSize ?? 0) > 0 ? r.askPrice / size : undefined,
      },
    ];
  });
}
