// „Wenn … dann …“ on the warrant page: the bet in one line, the payoff at maturity as a chart and a
// scenario („Wenn X am Ende bei 75 € steht …“) with quick picks. The order ticket's draft (number of
// warrants, buy limit) feeds the scenario. Payout model and its caveats: payoff.ts.
import { useCallback, useMemo, useState } from 'react';
import { DS } from '../ds';
import { useListingProfile, usePortfolio, usePriceSpread, useWarrant } from '../api/queries';
import type { ListingProfile } from '../api/types';
import { Plot } from '../charts/Plot';
import { parseDe, span } from '../lib/format';
import { useNow } from '../lib/useNow';
import { useUrlSearch } from '../lib/useUrlSearch';
import { Panel } from './Panel';
import {
  betSummary,
  breakEven,
  chartRange,
  money,
  outcome,
  PAYOUT_MODEL as MODEL,
  priceInput,
  quickPicks,
  termsOf,
  zoneText,
  type Draft,
  type PriceBasis,
} from './payoff';
import { payoffChart } from './warrantCharts';
import { warrantEnd } from './warrants';

type Theme = Parameters<typeof payoffChart>[0];

const DEFAULT_COUNT = 1000;

export function WarrantScenarioPanel({ profile, draft, bare = false }: { profile: ListingProfile; draft?: Draft; bare?: boolean }) {
  const asin = profile.securityIdentifier;
  const warrant = useWarrant(asin);
  const w = warrant.data;
  const uAsin = w?.underlying?.securityIdentifier ?? '';
  const uProfile = useListingProfile(uAsin);
  const spread = usePriceSpread(asin);
  const portfolio = usePortfolio();
  const now = useNow();

  const terms = useMemo(() => termsOf(w), [w]);
  const spot = uProfile.data?.lastPrice?.value;
  const name = w?.underlying?.name ?? 'der Basiswert';
  const end = w ? warrantEnd(w) : undefined;

  // Price per warrant: the buy limit typed in the ticket, else the ask, else the last trade.
  const ask = spread.data?.askPrice ?? profile.currentSpread?.askPrice ?? undefined;
  const last = profile.lastPrice?.value;
  const basis: PriceBasis = draft?.limit ? 'Limit' : ask ? 'Brief' : 'letzter Kurs';
  const price = draft?.limit || ask || last;

  // Number of warrants: the ticket's draft wins, else own input (default: held warrants or 1.000).
  const held = portfolio.data?.positions.find((p) => p.securityIdentifier === asin)?.numberOfShares;
  const [countText, setCountText] = useState('');
  const [seenDraft, setSeenDraft] = useState(draft?.shares);
  if (draft?.shares !== seenDraft) {
    setSeenDraft(draft?.shares);
    if (draft?.shares) setCountText(draft.shares.toLocaleString('de-DE'));
  }
  const typedCount = parseDe(countText);
  const count = Number.isFinite(typedCount) && typedCount > 0 ? Math.floor(typedCount) : (held ?? DEFAULT_COUNT);

  // Scenario: the underlying's price at maturity, kept in ?wenn= (typed text, written with a delay).
  const [text, setText] = useUrlSearch('wenn', 400, []);
  const typed = parseDe(text);
  const scenario = Number.isFinite(typed) && typed > 0 ? typed : spot;

  // Only a typed value outside the chart widens it – the slider stays inside, so dragging never rescales.
  const range = useMemo<[number, number] | undefined>(() => {
    if (!terms) return undefined;
    const be = breakEven(terms, price);
    const base = chartRange(terms, spot, [be]);
    if (scenario == null || (scenario >= base[0] && scenario <= base[1])) return base;
    return chartRange(terms, spot, [be, scenario]);
  }, [terms, spot, price, scenario]);

  const remaining = end ? (end > now ? `noch ${span(end - now)}` : 'fällig') : undefined;
  const figure = useCallback(
    (t: Theme, width: number) => payoffChart(t, width, { terms: terms!, price, spot, scenario, range: range!, remaining }),
    [terms, price, spot, scenario, range, remaining],
  );

  const kind = w?.type === 'PUT' ? 'Put' : 'Call';
  const loading = warrant.isLoading || (!!uAsin && uProfile.isLoading);
  return (
    <Panel
      className="panel--scenario"
    >
      {loading ? (
        <DS.Skeleton variant="block" />
      ) : !w || !terms || !range ? (
        <DS.EmptyState compact title="Keine Angaben zum Optionsschein">
          Die API kennt Referenzkurs oder Bezugsverhältnis nicht (mehr) – vielleicht ist der Schein schon fällig.
        </DS.EmptyState>
      ) : (
        <div className={`scn${bare ? ' scn--bare' : ''}`}>
          <p className="scn__summary">
            <span className="scn__eyebrow">Wenn … dann … · {kind}</span> {betSummary(terms, name, { end, now, price, basis })}
          </p>
          <div className="scn__body">
            <div className="scn__chart">
              <Plot
                aria-label={`Auszahlung je Schein bei Fälligkeit über dem Kurs von ${name}, mit Preis, Referenzkurs, Cap und Kurs jetzt`}
                figure={figure}
                onPointClick={(p) => typeof p.customdata?.[0] === 'number' && setText(priceInput(p.customdata[0]))}
              />
            </div>
            <Scenario
              name={name}
              terms={terms}
              spot={spot}
              scenario={scenario}
              text={text}
              setText={setText}
              range={range}
              price={price}
              basis={basis}
              count={count}
              countText={countText}
              setCountText={setCountText}
            />
          </div>
        </div>
      )}
    </Panel>
  );
}

function Scenario({
  name,
  terms,
  spot,
  scenario,
  text,
  setText,
  range,
  price,
  basis,
  count,
  countText,
  setCountText,
}: {
  name: string;
  terms: NonNullable<ReturnType<typeof termsOf>>;
  spot?: number;
  scenario?: number;
  text: string;
  setText: (s: string) => void;
  range: [number, number];
  price?: number;
  basis: PriceBasis;
  count: number;
  countText: string;
  setCountText: (s: string) => void;
}) {
  const picks = quickPicks(terms, spot);
  const o = scenario != null ? outcome(terms, scenario, price, count) : undefined;
  const step = (range[1] - range[0]) / 400;
  const same = (a: number, b: number) => Math.abs(a - b) <= Math.max(step, Math.abs(b) * 1e-4);
  return (
    <div className="scn__box">
      <div className="scn__if">
        <span className="scn__label" aria-hidden="true">
          Wenn {name} am Ende bei
        </span>
        <div className="scn__in">
          <DS.Input
            aria-label={`Kurs von ${name} am Ende`}
            size="sm"
            numeric
            suffix="€"
            value={text}
            placeholder={spot != null ? priceInput(spot) : ''}
            onChange={(e) => setText(e.target.value)}
          />
          <span aria-hidden="true">steht,</span>
        </div>
        <input
          className="scn__slider"
          type="range"
          aria-label={`Kurs von ${name} am Ende`}
          min={range[0]}
          max={range[1]}
          step={step}
          value={scenario ?? range[0]}
          onChange={(e) => setText(priceInput(Number(e.target.value)))}
        />
        <div className="scn__picks" role="group" aria-label="Schnellauswahl">
          {picks.map((q) => (
            <button
              key={q.label}
              type="button"
              className="scn__pick"
              aria-pressed={scenario != null && same(scenario, q.value)}
              onClick={() => setText(q.label === 'unverändert' ? '' : priceInput(q.value))}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>
      {o && scenario != null && (
        <div className="scn__then" aria-live="polite">
          <span className="scn__label">
            bekommst du{' '}
            <DS.Term title="Auszahlung (Annahme)" definition={MODEL}>
              je Schein
            </DS.Term>
          </span>
          <div className="scn__res">
            <span className="scn__big">{money(o.perWarrant)}</span>
            <span className="scn__why">{zoneText(terms, scenario)}</span>
          </div>
          <div className="scn__count">
            <span aria-hidden="true">×</span>
            <DS.Input
              aria-label="Anzahl Scheine"
              size="sm"
              numeric
              value={countText}
              placeholder={count.toLocaleString('de-DE')}
              onChange={(e) => setCountText(e.target.value)}
            />
            <span>
              Scheine = <b>{money(o.total)}</b>
            </span>
          </div>
          {o.pl != null && o.plPct != null && price != null ? (
            <div className="scn__pl">
              <DS.ProfitLoss value={o.pl} percent={o.plPct} variant="tag" size="md" />
              <span className="scn__basis">
                {basis === 'Limit' ? 'zu deinem Limit' : basis === 'Brief' ? 'zum Brief' : 'zum letzten Kurs'} {money(price)}
              </span>
            </div>
          ) : (
            <span className="scn__basis">Kein Brief – ohne Preis kein Gewinn oder Verlust.</span>
          )}
        </div>
      )}
    </div>
  );
}
