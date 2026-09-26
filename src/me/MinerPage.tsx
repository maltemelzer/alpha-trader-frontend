import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { DS } from '../ds';
import { useMiner, useMinerActions, usePortfolio, usePriceSpread } from '../api/queries';
import { Plot } from '../charts/Plot';
import { parseDe } from '../lib/format';
import { useMediaQuery } from '../lib/useMediaQuery';
import { paybackHours } from './derive';
import { affordableStep, bestStep, minerSteps, netAfter, planLength, storageHours } from './miner';
import { minerPlanChart } from './minerCharts';
import './MePage.css';

const COIN = 'ACALPHCOIN';
/** Horizon choices in days – the slider moves through these, so short horizons get room too. */
const HORIZONS = [1, 2, 3, 5, 7, 10, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365];
const QUICK = [7, 30, 90, 365];
const VIEWS = [
  { value: 'miner', label: 'Miner' },
  { value: 'planen', label: 'Ausbau planen' },
];

const dayText = (d: number) => `${d.toLocaleString('de-DE', { maximumFractionDigits: d < 10 ? 1 : 0 })}\u00a0${d === 1 ? 'Tag' : 'Tagen'}`;
const coins = (n: number) => `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\u00a0AC`;

/** AlphaCoin miner: output, storage, transfer to the portfolio, upgrade (after a confirmation) and an upgrade planner. */
export function MinerPage() {
  const miner = useMiner();
  const spread = usePriceSpread(COIN);
  const portfolio = usePortfolio();
  const { transfer, upgrade } = useMinerActions();
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const wide = useMediaQuery('(min-width: 1100px)');
  const phone = useMediaQuery('(max-width: 719.98px)');
  const view = params.get('ansicht') === 'planen' ? 'planen' : 'miner';

  const coinPrice = spread.data?.bidPrice ?? spread.data?.lastPrice?.value;
  const m = miner.data;
  const error = transfer.error ?? upgrade.error;

  const setView = (v: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v === 'miner') next.delete('ansicht');
        else next.set('ansicht', v);
        return next;
      },
      { replace: true },
    );

  const card = (
    // phone: the segment above already names the view – no second title
    <DS.Card title={phone ? undefined : 'Mein Miner'} fill={wide}>
      {m ? (
        <DS.MinerCard
          miner={m}
          coinPrice={coinPrice}
          cash={portfolio.data?.cash}
          paybackHours={paybackHours(m, coinPrice)}
          onTransfer={() =>
            transfer.mutate(undefined, { onSuccess: () => setDone(`${m.transferableCoins} AlphaCoins übertragen.`) })
          }
          onUpgrade={() => setConfirm(true)}
        />
      ) : (
        <DS.Loading rows={4} />
      )}
    </DS.Card>
  );
  const planner = <MinerPlanner coinPrice={coinPrice} cash={portfolio.data?.cash} />;

  return (
    <div className="page miner">
      <DS.PageHeader
        size="md"
        title="Miner"
        meta={coinPrice ? <span>AlphaCoin {DS.format.money(coinPrice, '€')}</span> : '\u00a0'}
        description="Der Miner schürft AlphaCoins in seinen Speicher. Jede Ausbaustufe kostet 50 % mehr als die vorige, bringt aber nur 25 % mehr Coins – rechne aus, bis wohin es sich lohnt."
      />
      {wide ? (
        <div className="page__body miner__body">
          {card}
          {planner}
        </div>
      ) : (
        <div className="page__body miner__body miner__body--tabs">
          <DS.SegmentedControl options={VIEWS} value={view} onChange={setView} aria-label="Ansicht" fullWidth />
          {view === 'miner' ? <div className="miner__scroll">{card}</div> : planner}
        </div>
      )}
      {error && <DS.Banner variant="error">Aktion fehlgeschlagen: {error.message}</DS.Banner>}
      {done && (
        <DS.ToastRegion>
          <DS.Toast title="Miner" duration={4000} onClose={() => setDone(null)}>
            {done}
          </DS.Toast>
        </DS.ToastRegion>
      )}
      <DS.Dialog
        open={confirm}
        size="sm"
        onClose={() => !upgrade.isPending && setConfirm(false)}
        title="Miner ausbauen?"
        description={
          m &&
          `Kosten ${DS.format.money(m.nextLevelCosts ?? 0, '€', 2, 'auto')} vom Privatkonto. Danach ${m.nextLevelCoinsPerHour?.toLocaleString('de-DE')} AC je Stunde statt ${m.coinsPerHour.toLocaleString('de-DE')}.`
        }
        actions={
          <>
            <DS.Button variant="secondary" onClick={() => setConfirm(false)} disabled={upgrade.isPending}>
              Abbrechen
            </DS.Button>
            <DS.Button
              variant="primary"
              loading={upgrade.isPending}
              onClick={() =>
                upgrade.mutate(undefined, {
                  onSuccess: () => {
                    setConfirm(false);
                    setDone('Miner ausgebaut.');
                  },
                })
              }
            >
              Ausbauen
            </DS.Button>
          </>
        }
      />
    </div>
  );
}

/**
 * „Bis wohin ausbauen?“: choose how long you will keep mining (?tage=) and the coin price; the chart
 * shows the profit after that time for every target level and how long each single level takes to pay
 * back. Click a bar to look at that level (?ziel=).
 */
function MinerPlanner({ coinPrice, cash }: { coinPrice?: number; cash?: number }) {
  const miner = useMiner();
  const m = miner.data;
  const [params, setParams] = useSearchParams();
  const [priceRaw, setPriceRaw] = useState('');
  const phone = useMediaQuery('(max-width: 719.98px)');

  const daysParam = Number(params.get('tage'));
  const horizonDays = HORIZONS.includes(daysParam) ? daysParam : 30;
  const hours = horizonDays * 24;
  const typed = parseDe(priceRaw);
  const price = priceRaw.trim() && typed > 0 ? typed : (coinPrice ?? 0);

  const plan = useMemo(() => {
    if (!m || !price) return null;
    const probe = minerSteps(m, price, 30);
    const best = bestStep(probe, hours, price);
    const affordable = affordableStep(probe, cash);
    const steps = probe.slice(0, planLength(best, affordable) + 1);
    return { steps, best, affordable };
  }, [m, price, hours, cash]);

  const zielParam = params.get('ziel');
  const selected = plan
    ? zielParam != null && Number(zielParam) >= 0 && Number(zielParam) < plan.steps.length
      ? Number(zielParam)
      : plan.affordable != null
        ? Math.min(plan.best, plan.affordable)
        : plan.best
    : 0;

  const update = (patch: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, val] of Object.entries(patch)) {
          if (val == null) next.delete(k);
          else next.set(k, val);
        }
        return next;
      },
      { replace: true },
    );
  const setHorizon = (d: number) => update({ tage: d === 30 ? null : String(d), ziel: null });

  const s = plan?.steps[selected];
  const net = s && plan ? netAfter(s, hours, price) : 0;
  const storage = m ? storageHours(m) : null;

  const bestText = !plan
    ? ''
    : plan.best === 0
      ? `Bei ${dayText(horizonDays)} lohnt sich kein Ausbau – schon die nächste Stufe braucht ${dayText((plan.steps[1]?.stepPaybackHours ?? 0) / 24)}, bis sie sich bezahlt hat.`
      : `Bei ${dayText(horizonDays)} lohnt sich der Ausbau bis Stufe +${plan.best}${plan.best >= 30 ? ' und weiter' : ''}; danach braucht jede Stufe länger als dein Zeitraum, bis sie sich bezahlt hat.`;
  const cashText =
    plan && plan.best > 0 && plan.affordable != null && plan.affordable < plan.best
      ? plan.affordable === 0
        ? ' Dein Bargeld reicht noch nicht für die nächste Stufe.'
        : ` Dein Bargeld reicht bis +${plan.affordable}.`
      : '';
  const summary = plan ? bestText + cashText : '\u00a0';
  const growth = s && m && s.step > 0 ? s.rate / m.coinsPerHour : 1;

  return (
    <DS.Card title={phone ? undefined : 'Bis wohin ausbauen?'} fill className="miner__plan">
      <div className="miner__planbody">
        <div className="miner__controls">
          <label className="miner__slider">
            <span className="miner__slider-label">
              <span>Wie lange schürfst du?</span>
              <span className="miner__mono">{dayText(horizonDays)}</span>
            </span>
            <input
              type="range"
              className="miner__range"
              aria-label="Zeitraum in Tagen"
              aria-valuetext={dayText(horizonDays)}
              min={0}
              max={HORIZONS.length - 1}
              step={1}
              value={HORIZONS.indexOf(horizonDays)}
              onChange={(e) => setHorizon(HORIZONS[Number(e.target.value)])}
            />
          </label>
          <div className="miner__quick" role="group" aria-label="Zeitraum wählen">
            {QUICK.map((d) => (
              <DS.Button key={d} size="sm" variant="ghost" aria-pressed={d === horizonDays} onClick={() => setHorizon(d)}>
                {d === 365 ? '1 Jahr' : `${d} T`}
              </DS.Button>
            ))}
          </div>
          <DS.Input
            className="miner__price"
            label="Coin-Kurs"
            size="sm"
            numeric
            suffix="€"
            placeholder={coinPrice ? coinPrice.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
            value={priceRaw}
            onChange={(e) => setPriceRaw(e.target.value)}
            error={priceRaw.trim() && !(typed > 0) ? 'z. B. 18.500' : undefined}
          />
        </div>

        <DS.StatGroup className="miner__tiles" aria-label="Gewählte Stufe">
          <DS.StatTile
            label={selected === 0 ? 'Ziel' : `Ziel +${selected}`}
            value={s ? coins(s.rate) : '–'}
            hint={
              s && s.step > 0
                ? `je Std. · ${growth >= 10 ? `${Math.round(growth).toLocaleString('de-DE')}×` : `+${Math.round((growth - 1) * 100)}\u00a0%`} gegenüber heute`
                : 'je Std. heute'
            }
          />
          <DS.StatTile
            label="Kosten"
            value={phone ? DS.format.money(s?.totalCost ?? 0, '€', s && s.totalCost >= 1e4 ? 0 : 2, 1e6) : s ? s.totalCost : 0}
            currency={phone ? undefined : '€'}
            compact={phone ? 1e6 : 'auto'}
            hint={
              plan?.affordable != null
                ? plan.affordable >= selected
                  ? 'Bargeld reicht'
                  : `Bargeld reicht bis +${plan.affordable}`
                : '\u00a0'
            }
          />
          <DS.StatTile
            label={phone ? `Gewinn ${horizonDays} T` : `Gewinn nach ${horizonDays} T`}
            value={net}
            currency="€"
            compact
            signed
            hint={s?.paybackHours != null ? `bezahlt nach ${dayText(s.paybackHours / 24)}` : '\u00a0'}
          />
        </DS.StatGroup>

        <p className="miner__summary">{summary}</p>

        <div className="miner__chart">
          {plan ? (
            <Plot
              aria-label="Gewinn je Ausbaustufe und Amortisation jeder Stufe"
              figure={(t, w) =>
                minerPlanChart(t, w, { steps: plan.steps, hours, coinPrice: price, best: plan.best, selected, affordable: plan.affordable, cash })
              }
              onPointClick={(pt) => update({ ziel: String(pt.customdata) })}
            />
          ) : (
            <DS.Skeleton variant="block" height="100%" />
          )}
        </div>

        <p className="miner__note">
          <span className="miner__key miner__key--best" aria-hidden="true" /> beste Stufe
          <span className="miner__key miner__key--worth" aria-hidden="true" /> lohnt sich
          <span className="miner__key miner__key--hatch" aria-hidden="true" /> Bargeld reicht nicht
          {!phone && ' · Klick auf einen Balken wählt die Stufe.'}
          {storage != null && ` Der Speicher fasst ${Math.round(storage)}\u00a0Std. – überträgst du seltener, schürft der Miner weniger.`}
          {' Verkaufst du viele Coins, sinkt der Kurs – rechne lieber mit einem vorsichtigen Kurs.'}
        </p>
      </div>
    </DS.Card>
  );
}
