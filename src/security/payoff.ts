// „Wenn … dann …“ for warrants: payout at maturity, profit/loss and plain-language texts – pure functions.
//
// Payout model, worked out from the game's own bookings (see CLAUDE.md „Optionsscheine“): every warrant
// has an escrow account. The issuer deposits, the buyers' money goes in too, and at maturity the escrow
// pays the holders and refunds the rest to the issuer.
// - Call: pays ratio × min(underlying, cap) – the full value of the underlying up to the cap, not the
//   distance to the strike. Confirmed by a settlement (WAS6HHKLOM, 26.09.2026: ratio 0,1, underlying
//   1,66 € → 0,16 € per warrant) and by 9 deposits: deposit = ratio × cap − issue price.
// - Put: the mirror image around the issue price P: pays 2P − ratio × max(underlying, cap), at least 0.
//   Derived from 8 deposits (deposit = P − ratio × cap, so the escrow holds 2P − ratio × cap per
//   warrant); no put settlement seen yet.
// The payout per warrant is rounded down to the cent (0,166 → 0,16). The settlement price is the
// underlying's last price at maturity.
import type { WarrantApiView } from '../api/queries';
import { short } from '../lib/format';

const NBSP = String.fromCharCode(0xa0);

/** The payout model in words, for a Term next to every payout. */
export const PAYOUT_MODEL =
  'Call: Bezugsverhältnis × Kurs des Basiswerts bei Fälligkeit, höchstens × Cap – also der volle Wert, nicht nur der Abstand zum Referenzkurs. ' +
  'So wurde am 26.09.2026 ein Call eingelöst (0,1 × 1,66 € → 0,16 € je Schein, auf den Cent abgerundet). ' +
  'Put: spiegelbildlich um den Ausgabepreis P: 2 × P − Bezugsverhältnis × Kurs, höchstens bis zum Cap, nie unter 0 – aus den Hinterlegungen der Emittenten abgeleitet, eine Put-Einlösung ist noch nicht gesehen.';

export interface Terms {
  type: 'CALL' | 'PUT';
  /** Referenzkurs (strike) – for the payout itself only the cap and the issue price matter */
  strike: number;
  /** Cap on the underlying; without it the payout is not capped */
  cap?: number;
  /** Underlying per warrant (0,1 shares, 0,001 indexes) */
  ratio: number;
  /** Issue price per warrant (the issuer's ask); a put pays around it. Without it: ratio × strike. */
  issuePrice?: number;
}

/** Terms from the API warrant; `issuePrice` = the issuer's ask (needed for puts). */
export function termsOf(
  w: Pick<WarrantApiView, 'type' | 'underlyingValue' | 'underlyingCapValue' | 'ratio'> | undefined,
  issuePrice?: number,
): Terms | undefined {
  if (!w?.underlyingValue || !w.ratio) return undefined;
  const cap = w.underlyingCapValue ?? undefined;
  return {
    type: w.type === 'PUT' ? 'PUT' : 'CALL',
    strike: w.underlyingValue,
    cap: cap || undefined,
    ratio: w.ratio,
    issuePrice: issuePrice && issuePrice > 0 ? issuePrice : undefined,
  };
}

/** The price a put mirrors around: the issue price, else ratio × strike. */
const base = (t: Terms) => t.issuePrice ?? t.ratio * t.strike;
const cents = (x: number) => Math.max(0, Math.floor(x * 100 + 1e-7) / 100);

/** Cash per warrant at maturity when the underlying ends at `s` (rounded down to the cent). */
export function payout(t: Terms, s: number): number {
  if (!(s >= 0)) return 0;
  if (t.type === 'CALL') return cents(t.ratio * (t.cap != null ? Math.min(s, t.cap) : s));
  return cents(2 * base(t) - t.ratio * (t.cap != null ? Math.max(s, t.cap) : s));
}

/** The most a warrant can pay (call without cap: Infinity). */
export function maxPayout(t: Terms): number {
  if (t.type === 'CALL') return t.cap != null ? cents(t.ratio * t.cap) : Infinity;
  return cents(2 * base(t) - t.ratio * (t.cap ?? 0));
}

/** Underlying price from which the payout covers `price` – undefined when not even the cap pays that much. */
export function breakEven(t: Terms, price: number | undefined): number | undefined {
  if (price == null || !(price >= 0)) return undefined;
  if (price > maxPayout(t) + 1e-12) return undefined;
  return t.type === 'CALL' ? price / t.ratio : (2 * base(t) - price) / t.ratio;
}

/** Underlying price at which a put pays nothing any more (twice its issue value). */
export function putZero(t: Terms): number {
  return (2 * base(t)) / t.ratio;
}

/** Where the underlying price `s` lies for this warrant. */
export type Zone = 'worthless' | 'between' | 'capped';
export function zoneOf(t: Terms, s: number): Zone {
  if (t.type === 'CALL') return s <= 0 ? 'worthless' : t.cap != null && s >= t.cap ? 'capped' : 'between';
  return s >= putZero(t) ? 'worthless' : t.cap != null && s <= t.cap ? 'capped' : 'between';
}

export interface Outcome {
  /** Cash per warrant */
  perWarrant: number;
  /** Cash for all warrants */
  total: number;
  /** What the warrants cost at `price` */
  cost?: number;
  /** Profit (+) or loss (−) in € */
  pl?: number;
  /** … in % of the cost */
  plPct?: number;
}

/** Result of `count` warrants bought at `price` when the underlying ends at `s`. */
export function outcome(t: Terms, s: number, price: number | undefined, count: number): Outcome {
  const perWarrant = payout(t, s);
  const n = Math.max(0, count || 0);
  const total = perWarrant * n;
  if (price == null || !(price > 0)) return { perWarrant, total };
  const cost = price * n;
  const pl = total - cost;
  return { perWarrant, total, cost, pl, plPct: (perWarrant / price - 1) * 100 };
}

/** Payout curve from lo to hi, with the kinks (strike, cap) as exact points. */
export function payoffPoints(t: Terms, lo: number, hi: number, n = 120): { x: number; y: number }[] {
  if (!(hi > lo)) return [];
  const xs = new Set<number>();
  for (let i = 0; i <= n; i++) xs.add(lo + ((hi - lo) * i) / n);
  for (const k of [t.strike, t.cap]) if (k != null && k > lo && k < hi) xs.add(k);
  return [...xs].sort((a, b) => a - b).map((x) => ({ x, y: payout(t, x) }));
}

/**
 * x range of the payoff chart: strike, cap, the price now, break-even and scenario inside, plus
 * room for the quick picks (±10 % around the price now).
 */
export function chartRange(t: Terms, spot: number | undefined, extra: (number | undefined)[] = []): [number, number] {
  const pts = [t.strike, t.cap, spot, spot != null ? spot * 0.9 : undefined, spot != null ? spot * 1.1 : undefined, ...extra].filter(
    (x): x is number => x != null && Number.isFinite(x) && x > 0,
  );
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  const pad = (hi - lo) * 0.08 || hi * 0.05;
  return [Math.max(0, lo - pad), hi + pad];
}

const pctText = (p: number) => {
  const r = Math.round(p);
  if (r === 0) return '±0 %';
  return `${r > 0 ? '+' : '−'}${Math.abs(r)}\u00a0%`;
};

/** Quick picks for the scenario, lowest price first: −10 %, unchanged, +5 % and the cap (put: mirrored). */
export function quickPicks(t: Terms, spot: number | undefined): { label: string; value: number }[] {
  if (!spot) return [];
  const capPick = t.cap != null ? [{ label: `Cap ${pctText((t.cap / spot - 1) * 100)}`, value: t.cap }] : [];
  const out =
    t.type === 'CALL'
      ? [{ label: '−10\u00a0%', value: spot * 0.9 }, { label: 'unverändert', value: spot }, { label: '+5\u00a0%', value: spot * 1.05 }, ...capPick]
      : [...capPick, { label: '−5\u00a0%', value: spot * 0.95 }, { label: 'unverändert', value: spot }, { label: '+10\u00a0%', value: spot * 1.1 }];
  return out;
}

/** Decimals for a price: two from 0,10 on, else four (0,0178 €), six below 0,001. */
function priceDigits(n: number) {
  const a = Math.abs(n);
  return a >= 0.1 || a === 0 ? 2 : a >= 0.001 ? 4 : 6;
}

/** Amount in € for the texts: „0,71 €“, „0,0178 €“, „1.234,50 €“, „4,7 Mio. €“; minus as „−“. */
export function money(n: number): string {
  if (!Number.isFinite(n)) return '–';
  const a = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (a >= 1e6) return `${sign}${short(a)}\u00a0€`;
  const d = priceDigits(a);
  return `${sign}${a.toLocaleString('de-DE', { minimumFractionDigits: Math.min(d, 2), maximumFractionDigits: d })}\u00a0€`;
}

/** Underlying price as typed in the scenario field („71,96“, „1.793,28“) – no currency. */
export function priceInput(n: number): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: n >= 0.1 ? 2 : 4 });
}

/** Maturity as read in a sentence: „heute 22:00“, „morgen 13:26“, „am 28.9. um 13:26“. */
export function dueText(end: number, now: number): string {
  const d = new Date(end);
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const day = (ms: number) => {
    const x = new Date(ms);
    return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  };
  const days = Math.round((day(end) - day(now)) / 86_400_000);
  if (days === 0) return `heute ${time}`;
  if (days === 1) return `morgen ${time}`;
  return `am ${d.getDate()}.${d.getMonth() + 1}. um ${time}`;
}

/** Which price the profit/loss is measured against. */
export type PriceBasis = 'Brief' | 'Limit' | 'letzter Kurs';

/** Ratio as a factor in a text: „0,1“, „0,001“. */
const ratioWord = (r: number) => r.toLocaleString('de-DE', { maximumFractionDigits: 6 });

/**
 * The bet in one line, e.g. „Du wettest, dass Alphakasse SE bis morgen 13:26 steigt: Der Schein zahlt
 * 0,1 × den Kurs, höchstens 7,84 € (ab 78,45 €). Gewinn zum Brief von 7,20 € ab 72,00 €.“
 */
export function betSummary(
  t: Terms,
  name: string,
  opts: { end?: number; now: number; price?: number; basis?: PriceBasis },
): string {
  const call = t.type === 'CALL';
  const when = opts.end ? ` bis ${dueText(opts.end, opts.now)}` : '';
  const r = ratioWord(t.ratio);
  const rule = call
    ? `Der Schein zahlt ${r} × den Kurs`
    : `Der Schein zahlt ${money(2 * base(t))} − ${r} × den Kurs`;
  const head = `Du wettest, dass ${name}${when} ${call ? 'steigt' : 'fällt'}: ${rule}`;
  const max = maxPayout(t);
  const top = Number.isFinite(max) ? `, höchstens ${money(max)}${t.cap != null ? ` (${call ? 'ab' : 'bis'} ${money(t.cap)})` : ''}` : '';
  const { price, basis = 'Brief' } = opts;
  if (price == null || !(price > 0)) return `${head}${top}.`;
  const at = basis === 'Limit' ? 'zu deinem Limit von' : basis === 'Brief' ? 'zum Brief von' : 'zum letzten Kurs von';
  const be = breakEven(t, price);
  if (be == null) {
    const best = (max / price - 1) * 100;
    return `${head}${top} – ${at} ${money(price)} selbst dann ${best < 0 ? `ein Verlust (${pctText(best)})` : 'kein Gewinn'}.`;
  }
  const best = (max / price - 1) * 100;
  return `${head}${top}. Gewinn ${at} ${money(price)} ${call ? 'über' : 'unter'} ${money(be)}, höchstens ${pctText(best)}.`;
}

/** Why the payout is what it is, for the scenario result. */
export function zoneText(t: Terms, s: number): string {
  const z = zoneOf(t, s);
  const call = t.type === 'CALL';
  const r = ratioWord(t.ratio);
  if (z === 'worthless') return call ? 'Basiswert ohne Kurs – der Schein zahlt nichts' : `ab ${money(putZero(t))} zahlt der Put nichts mehr`;
  if (z === 'capped') return `${call ? 'über' : 'unter'} dem Cap – mehr zahlt der Schein nicht`;
  return call ? `${r} × ${money(s)}` : `${money(2 * base(t))} − ${r} × ${money(s)}`;
}

/** An order ticket draft as the scenario needs it. */
export interface Draft {
  shares?: number;
  /** Limit of a buy order */
  limit?: number;
}

/**
 * Reads the draft of DS.OrderTicket from its DOM (the ticket has no change callback): the number of
 * warrants (or the amount ÷ price) and the limit of a buy order. `price` = price per warrant used for
 * an amount entry when there is no limit.
 */
export function readTicketDraft(root: ParentNode, price: number | undefined, parse: (s: string) => number): Draft {
  const val = (sel: string) => {
    const el = root.querySelector<HTMLInputElement>(sel);
    if (!el) return undefined;
    const n = parse(el.value);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const action = root.querySelector('[aria-label="Aktion"] [aria-checked="true"]')?.textContent?.trim();
  const limit = action === 'Verkaufen' ? undefined : val('.bnk-ot__lim input');
  let shares = val('input[aria-label="Anteile"]');
  if (shares == null) {
    const amount = val('input[aria-label="Geldbetrag"]');
    const px = limit ?? price;
    if (amount != null && px) shares = Math.floor(amount / px) || undefined;
  }
  return { shares: shares != null ? Math.floor(shares) : undefined, limit };
}

/** Quick picks for all warrants on one underlying: ±10 %, ±5 % and unchanged, lowest first. */
export function movePicks(spot: number | undefined): { label: string; value: number }[] {
  if (!spot) return [];
  return [-10, -5, 0, 5, 10].map((p) => ({ label: p === 0 ? 'unverändert' : `${p > 0 ? '+' : '−'}${Math.abs(p)}${NBSP}%`, value: spot * (1 + p / 100) }));
}

/** Result of one warrant in a scenario, for a label next to its bar: „0,57 € · ▲ +89 %“. */
export interface ScenarioLabel {
  text: string;
  /** 1 gain, −1 loss, 0 no price (payout only) or break-even */
  sign: -1 | 0 | 1;
}

/**
 * Per warrant (by its ASIN): payout at `s` and profit/loss in % at its ask (a put's issue price is taken
 * to be its ask). Warrants without terms are left out; without an ask only the payout is shown.
 */
export function scenarioLabels(
  ws: Pick<WarrantApiView, 'type' | 'underlyingValue' | 'underlyingCapValue' | 'ratio' | 'listing'>[],
  s: number,
  askOf: (asin: string) => number | undefined,
): Record<string, ScenarioLabel> {
  const out: Record<string, ScenarioLabel> = {};
  for (const w of ws) {
    const asin = w.listing?.securityIdentifier;
    const ask = asin ? askOf(asin) : undefined;
    const t = termsOf(w, ask);
    if (!asin || !t) continue;
    const o = outcome(t, s, ask, 1);
    if (o.plPct == null) {
      out[asin] = { text: money(o.perWarrant), sign: 0 };
      continue;
    }
    const r = Math.round(o.plPct);
    const sign = r > 0 ? 1 : r < 0 ? -1 : 0;
    const pct = sign === 0 ? `±0${NBSP}%` : `${sign > 0 ? '▲ +' : '▼ −'}${Math.abs(r).toLocaleString('de-DE')}${NBSP}%`;
    out[asin] = { text: `${money(o.perWarrant)} · ${pct}`, sign };
  }
  return out;
}
