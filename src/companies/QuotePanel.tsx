import { useState } from 'react';
import { DS } from '../ds';
import { useAccountPortfolio, useListingProfile, useOpenOrders, useOrderbook, usePlaceQuote, usePriceSpread } from '../api/queries';
import type { OrderbookView } from '../api/types';
import { Plot } from '../charts/Plot';
import { parseDe, short } from '../lib/format';
import { PERCENT_QUOTED } from '../security/charts';
import { depth, depthNear } from '../security/derive';
import { quoteChart } from './charts';
import { Confirm } from './Confirm';
import { volumeRateText, type Sponsorship } from './derive';
import {
  bestPrices,
  MM_RULES,
  pricesAround,
  quoteBand,
  quoteErrors,
  quoteShare,
  runningQuote,
  shareBounds,
  spreadPct,
  suggestQuote,
  unitCost,
  type Quote,
} from './quote';
import { RatingMeter } from './Sponsorships';
import './QuotePanel.css';

const NBSP = String.fromCharCode(0xa0);
const pctText = (n: number, d = 2) => `${n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d })}${NBSP}%`;
/** Quoted share of all shares (fraction) – tiny values keep two significant digits. */
const shareText = (f: number | undefined) =>
  f == null ? '–' : `${(f * 100).toLocaleString('de-DE', { maximumSignificantDigits: 2 })}${NBSP}%`;
/** Share counts in hints: short from 1 Mio. on (37,59 Mio.), otherwise in full. */
const stk = (n: number) => (n >= 1e6 ? short(n) : `${n.toLocaleString('de-DE')}${NBSP}Stk.`);
const inputText =(n: number | undefined, decimals = 4) => (n == null ? '' : n.toLocaleString('de-DE', { maximumFractionDigits: decimals }));
const num = (s: string) => {
  const n = parseDe(s);
  return Number.isNaN(n) ? undefined : n;
};

type Fields = Record<keyof Quote, string>;
const toFields = (q: Partial<Quote> | undefined): Fields => ({
  buyPrice: inputText(q?.buyPrice),
  sellPrice: inputText(q?.sellPrice),
  buyShares: inputText(q?.buyShares, 0),
  sellShares: inputText(q?.sellShares, 0),
});

/**
 * Quote of a designated sponsor (market maker) for one sponsored listing: the order book with the
 * quote drawn in, market spread against the quote's spread, rating and quoted volume, and the form.
 * The rules (`MM_RULES`: spread ≥ 5 %, 1–2 % of the shares per side) are two controls that fill the
 * price and share fields; the fields stay editable and say when a rule is broken. Prefilled with
 * the minimum the rules allow. Sending asks first.
 * `compact` leaves the chart out (the securities page shows the depth next to it).
 */
export function QuotePanel({
  sponsorship: s,
  owner,
  compact = false,
  onBack,
  onDone,
}: {
  sponsorship: Sponsorship;
  /** securities account of the sponsor company */
  owner: string | undefined;
  compact?: boolean;
  onBack?: () => void;
  onDone: (msg: string) => void;
}) {
  const asin = s.listing.securityIdentifier;
  const ob = useOrderbook(asin);
  const spread = usePriceSpread(asin);
  const profile = useListingProfile(asin);
  const account = useAccountPortfolio(owner);
  const orders = useOpenOrders(owner);

  const type = profile.data?.type ?? s.listing.type;
  const percentQuoted = PERCENT_QUOTED.includes(type);
  const faceValue = percentQuoted ? (profile.data?.bond?.faceValue ?? undefined) : undefined;
  const market = bestPrices(ob.data, spread.data, profile.data?.lastPrice?.value);
  const pos = account.data?.positions.find((p) => p.securityIdentifier === asin);
  const cash = account.data?.cash;
  const freeShares = account.data ? (pos ? pos.numberOfShares - pos.committedShares : 0) : undefined;
  const running = runningQuote(orders.data?.content, asin);
  const ready = ob.isFetched && profile.isFetched && (account.isFetched || !owner);

  return (
    <div className={`mmq${compact ? ' mmq--compact' : ''}`}>
      <div className="mmq__head">
        {onBack && (
          <DS.Button size="sm" variant="ghost" onClick={onBack}>
            ← Mandate
          </DS.Button>
        )}
        <h3 className="mm__title mmq__title">
          Quote für <a href={`/wertpapier/${asin}`}>{s.listing.name}</a>
        </h3>
        <span className="mmq__asin num">{asin}</span>
      </div>
      {!owner && <DS.Banner variant="error">Das Wertpapierkonto von {s.designatedSponsor.name} ist nicht bekannt – Quotes gehen nicht.</DS.Banner>}
      {ready ? (
        <QuoteForm
          key={asin}
          s={s}
          owner={owner}
          ob={ob.data}
          market={market}
          type={type}
          percentQuoted={percentQuoted}
          faceValue={faceValue}
          cash={cash}
          freeShares={freeShares}
          outstanding={profile.data?.outstandingShares}
          running={running}
          compact={compact}
          onDone={onDone}
        />
      ) : (
        <DS.Loading rows={5} label="Orderbuch wird geladen" />
      )}
    </div>
  );
}

function QuoteForm({
  s,
  owner,
  ob,
  market,
  type,
  percentQuoted,
  faceValue,
  cash,
  freeShares,
  outstanding,
  running,
  compact,
  onDone,
}: {
  s: Sponsorship;
  owner: string | undefined;
  ob: OrderbookView | undefined;
  market: { bid?: number; ask?: number; mid?: number };
  type: string;
  percentQuoted: boolean;
  faceValue: number | undefined;
  cash: number | undefined;
  freeShares: number | undefined;
  outstanding: number | undefined;
  running: Partial<Quote> | undefined;
  compact: boolean;
  onDone: (msg: string) => void;
}) {
  const asin = s.listing.securityIdentifier;
  const suggestion = suggestQuote({ mid: market.mid, cash, freeShares, outstanding, faceValue, percentQuoted });
  const [f, setF] = useState<Fields>(() => toFields(suggestion));
  // Text of the rule controls while they are being edited; null = follow the fields.
  const [spreadText, setSpreadText] = useState<string | null>(null);
  const [volText, setVolText] = useState<string | null>(null);
  // Middle the spread control widens around, fixed while it is being edited (no drift from rounding).
  const [anchor, setAnchor] = useState<number | undefined>(undefined);
  const [asked, setAsked] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const place = usePlaceQuote();

  const buyPrice = num(f.buyPrice);
  const sellPrice = num(f.sellPrice);
  const q: Partial<Quote> = { buyPrice, sellPrice, buyShares: num(f.buyShares), sellShares: num(f.sellShares) };
  const errors = quoteErrors(q, { cash, freeShares, faceValue, outstanding });
  const valid = Object.keys(errors).length === 0;
  // Empty fields only complain after the first attempt; wrong values right away.
  const err = (k: keyof Quote) => (asked || f[k].trim() ? errors[k] : undefined);

  const unit = percentQuoted ? '%' : '€';
  const price = (n: number) => DS.format.price(n, type);
  const marketSpread = spreadPct(market.bid, market.ask);
  const mySpread = spreadPct(q.buyPrice, q.sellPrice);
  const maxSpread = Math.max(marketSpread ?? 0, mySpread ?? 0, MM_RULES.minSpreadPct);
  const bounds = shareBounds(outstanding);
  const affordable = cash != null && q.buyPrice ? Math.floor(cash / unitCost(q.buyPrice, faceValue)) : undefined;
  const buyShare = quoteShare(q.buyShares, outstanding);
  const sellShare = quoteShare(q.sellShares, outstanding);
  const set = (k: keyof Quote) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (k === 'buyPrice' || k === 'sellPrice') setSpreadText(null);
    else setVolText(null);
    setF((prev) => ({ ...prev, [k]: value }));
  };
  const setSpread = (text: string) => {
    const quoteMid = buyPrice && sellPrice && sellPrice > buyPrice ? (buyPrice + sellPrice) / 2 : undefined;
    const center = (spreadText != null && anchor) || quoteMid || market.mid;
    setSpreadText(text);
    setAnchor(center);
    const v = num(text);
    const p = center && v != null ? pricesAround(center, v, percentQuoted) : undefined;
    if (p) setF((prev) => ({ ...prev, buyPrice: inputText(p.buyPrice), sellPrice: inputText(p.sellPrice) }));
  };
  const setVolume = (text: string) => {
    setVolText(text);
    const v = num(text);
    if (v == null || !outstanding || v <= 0) return;
    const n = inputText(Math.max(1, Math.round((v / 100) * outstanding)), 0);
    setF((prev) => ({ ...prev, buyShares: n, sellShares: n }));
  };
  const spreadValue = spreadText ?? (mySpread != null ? inputText(Math.floor(mySpread * 100 + 1e-6) / 100, 2) : '');
  const sameShare = buyShare != null && buyShare === sellShare;
  const volValue = volText ?? (sameShare ? inputText(buyShare * 100, 3) : '');
  const clamp = (v: number | undefined, lo: number, hi: number, fallback: number) => Math.min(hi, Math.max(lo, v ?? fallback));

  const mid = market.mid;
  const band = quoteBand(mid, [market.bid, market.ask, buyPrice, sellPrice]);
  // No manual memo: the React compiler memoizes the figure by its inputs.
  const near = mid ? depthNear(depth(ob), mid, band) : undefined;
  const figure = (t: Parameters<typeof quoteChart>[0], w: number) => quoteChart(t, w, near!, mid, { buyPrice, sellPrice }, type);

  const diff = marketSpread != null && mySpread != null ? mySpread - marketSpread : undefined;
  const diffText =
    diff == null
      ? marketSpread == null
        ? 'Der Markt hat gerade kein Geld und keinen Brief – dein Quote wäre das einzige Angebot.'
        : NBSP
      : diff < 0
        ? `▼ −${pctText(-diff).replace(`${NBSP}%`, '')} Pp. enger als der Markt`
        : diff > 0
          ? `▲ +${pctText(diff).replace(`${NBSP}%`, '')} Pp. weiter als der Markt`
          : 'So eng wie der Markt.';

  const send = () =>
    owner &&
    valid &&
    place.mutate({ owner, securityIdentifier: asin, ...(q as Quote) }, {
      onSuccess: () => {
        setConfirming(false);
        onDone(`Quote für ${s.listing.name} gestellt.`);
      },
    });

  return (
    <div className="mmq__grid">
      <div className="mmq__visual">
        {!compact && (
          <div className="mmq__chart">
            {near && (near.bids.price.length || near.asks.price.length || q.buyPrice) ? (
              <Plot aria-label={`Orderbuch ${s.listing.name} mit deinem Quote`} figure={figure} />
            ) : (
              <DS.EmptyState compact as="h4" title="Leeres Orderbuch">
                Niemand bietet gerade – dein Quote setzt den ersten Kurs.
              </DS.EmptyState>
            )}
          </div>
        )}
        <div className="mmq__spreads">
          <DS.ProgressBar
            size="sm"
            variant="neutral"
            label="Spread Markt"
            value={marketSpread ?? 0}
            max={maxSpread}
            valueText={marketSpread != null ? pctText(marketSpread) : '–'}
            hint={market.bid && market.ask ? `Geld ${price(market.bid)} · Brief ${price(market.ask)}` : 'kein Geld/Brief'}
          />
          <DS.ProgressBar
            size="sm"
            variant="neutral"
            label="Spread dein Quote"
            value={mySpread ?? 0}
            max={maxSpread}
            valueText={mySpread != null ? pctText(mySpread) : '–'}
            hint={diffText}
          />
        </div>
        <DS.StatGroup columns={compact ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))'} aria-label="Pflichten als Market Maker" className="mmq__stats">
          <DS.StatTile label="Rating" value={<RatingMeter rating={s.sponsorRating?.value} />} hint="A am besten" />
          <DS.StatTile label="Quotiert / Tag" value={volumeRateText(s.sponsorRating?.dailyVolumeRate)} hint="aller Anteile, bisher" />
          <DS.StatTile
            label="Dieser Quote"
            value={buyShare != null && buyShare === sellShare ? shareText(buyShare) : buyShare != null || sellShare != null ? `${shareText(buyShare)} / ${shareText(sellShare)}` : '–'}
            hint={sameShare ? 'je Seite, aller Anteile (1–2 %)' : 'Kauf / Verkauf, aller Anteile (1–2 %)'}
          />
        </DS.StatGroup>
      </div>

      <div className="mmq__form">
        <fieldset className="mmq__rules">
          <legend className="mmq__legend">Regeln für Market Maker</legend>
          <div className="mmq__rule">
            <DS.Input
              numeric
              size="sm"
              label="Spread"
              suffix="%"
              value={spreadValue}
              onChange={(e) => setSpread(e.target.value)}
              error={errors.spread}
              hint={`mind. ${MM_RULES.minSpreadPct}${NBSP}% des Briefs`}
            />
            <input
              type="range"
              className="mmq__range"
              aria-label="Spread in Prozent"
              min={MM_RULES.minSpreadPct}
              max={20}
              step={0.1}
              value={clamp(num(spreadValue), MM_RULES.minSpreadPct, 20, MM_RULES.minSpreadPct)}
              onChange={(e) => setSpread(inputText(Number(e.target.value), 2))}
            />
          </div>
          <div className="mmq__rule">
            <DS.Input
              numeric
              size="sm"
              label="Volumen je Seite"
              suffix="%"
              value={volValue}
              disabled={!bounds}
              onChange={(e) => setVolume(e.target.value)}
              error={volText != null ? (errors.buyShares ?? errors.sellShares) : undefined}
              hint={
                bounds
                  ? `1–2${NBSP}% = ${stk(bounds.min)}–${stk(bounds.max)}`
                  : 'Zahl der Anteile unbekannt'
              }
            />
            <input
              type="range"
              className="mmq__range"
              aria-label="Volumen je Seite in Prozent der Anteile"
              min={MM_RULES.minShare * 100}
              max={MM_RULES.maxShare * 100}
              step={0.05}
              disabled={!bounds}
              value={clamp(num(volValue), MM_RULES.minShare * 100, MM_RULES.maxShare * 100, MM_RULES.minShare * 100)}
              onChange={(e) => setVolume(inputText(Number(e.target.value), 2))}
            />
          </div>
        </fieldset>
        <div className="mmq__fields">
          <DS.Input
            numeric
            size="sm"
            label="Kaufen zu"
            suffix={unit}
            value={f.buyPrice}
            onChange={set('buyPrice')}
            error={err('buyPrice')}
            hint={market.bid ? `Bestes Geld ${price(market.bid)}` : 'Noch kein Geld'}
          />
          <DS.Input
            numeric
            size="sm"
            label="Stück Kauf"
            value={f.buyShares}
            onChange={set('buyShares')}
            error={err('buyShares')}
            hint={affordable != null ? `Bargeld reicht für ${affordable.toLocaleString('de-DE')}` : NBSP}
          />
          <DS.Input
            numeric
            size="sm"
            label="Verkaufen zu"
            suffix={unit}
            value={f.sellPrice}
            onChange={set('sellPrice')}
            error={err('sellPrice')}
            hint={market.ask ? `Bester Brief ${price(market.ask)}` : 'Noch kein Brief'}
          />
          <DS.Input
            numeric
            size="sm"
            label="Stück Verkauf"
            value={f.sellShares}
            onChange={set('sellShares')}
            error={err('sellShares')}
            hint={freeShares != null ? `${freeShares.toLocaleString('de-DE')} frei` : NBSP}
          />
        </div>
        {errors.form && (asked || (f.buyPrice && f.sellPrice)) && <p className="mmq__error">{errors.form}</p>}
        <p className="company__note">
          {running
            ? `Laufender Quote: Geld ${running.buyPrice != null ? price(running.buyPrice) : '–'} × ${running.buyShares?.toLocaleString('de-DE') ?? '–'} · Brief ${running.sellPrice != null ? price(running.sellPrice) : '–'} × ${running.sellShares?.toLocaleString('de-DE') ?? '–'}`
            : 'Noch kein Quote im Orderbuch.'}
        </p>
        <div className="panel__actions">
          <DS.Button
            variant="primary"
            size="sm"
            disabled={!owner}
            onClick={() => {
              setAsked(true);
              if (valid) {
                place.reset();
                setConfirming(true);
              }
            }}
          >
            Quote stellen …
          </DS.Button>
          {suggestion && (
            <DS.Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSpreadText(null);
                setVolText(null);
                setF(toFields(suggestion));
              }}
            >
              Mindestwerte
            </DS.Button>
          )}
        </div>
      </div>

      <Confirm
        open={confirming}
        alert
        title={`Quote für ${s.listing.name} stellen?`}
        description={`${s.designatedSponsor.name} legt zwei verbindliche Orders ins Orderbuch. Andere können sofort dagegen handeln.`}
        confirmLabel="Quote stellen"
        pending={place.isPending}
        error={place.isError ? place.error.message : null}
        onConfirm={send}
        onClose={() => !place.isPending && setConfirming(false)}
      >
        {valid && (
          <DS.SummaryList
            items={[
              { label: `Kauf ${q.buyShares!.toLocaleString('de-DE')} Stk. zu ${price(q.buyPrice!)}`, value: unitCost(q.buyPrice!, faceValue) * q.buyShares! },
              { label: `Verkauf ${q.sellShares!.toLocaleString('de-DE')} Stk. zu ${price(q.sellPrice!)}`, value: unitCost(q.sellPrice!, faceValue) * q.sellShares! },
              { label: 'Spread', value: mySpread != null ? pctText(mySpread) : '–' },
            ]}
          />
        )}
      </Confirm>
    </div>
  );
}
