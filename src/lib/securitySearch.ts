/**
 * One security search for the header, the chat suggestions (#/!) and the OTC ticket. `pricespreads?search=`
 * knows no bonds or repos, so bonds come from `/api/v2/bonds?search=` and an exact ASIN
 * (any type, also warrants and matured bonds) from `/api/listings/{asin}`.
 */

export interface SecurityHit {
  asin: string;
  name: string;
  type: string;
  price?: number;
}

/** Search text without a leading `#`/`!`/`$` (mention syntax), trimmed. */
export const searchTerm = (q: string) => q.trim().replace(/^[#!$]/, '').trim();

/** An ASIN: a letter and nine letters/digits (STSN3G03LB, BOXLWU96VV, ACALPHCOIN) – as in chat/mentions. */
export const isAsin = (q: string) => /^[A-Z][A-Z0-9]{9}$/i.test(searchTerm(q));

/** How many places bonds keep when the spread search alone would fill the list. */
const BOND_SLOTS = 3;

/**
 * Exact ASIN first, then spreads (stocks, coins, buildings …) with room for up to three bonds,
 * then whatever is left; each ASIN once.
 */
export function mergeHits(
  parts: { exact?: SecurityHit | null; spreads: SecurityHit[]; bonds: SecurityHit[] },
  limit: number,
): SecurityHit[] {
  const out: SecurityHit[] = [];
  const seen = new Set<string>();
  const add = (h: SecurityHit) => {
    if (out.length >= limit || seen.has(h.asin)) return;
    seen.add(h.asin);
    out.push(h);
  };
  if (parts.exact) add(parts.exact);
  const bondSlots = Math.min(BOND_SLOTS, parts.bonds.length);
  for (const h of parts.spreads) if (out.length < limit - bondSlots) add(h);
  for (const h of parts.bonds) add(h);
  for (const h of parts.spreads) add(h);
  return out;
}
