import { useEffect, useState } from 'react';
import { DS } from '../ds';
import type { IconName } from '../../design-system/components';
import { useMediaQuery } from '../lib/useMediaQuery';
import { candles, nextCandle, priceRange, rng, type Candle } from './candles';

const COUNT = 40;
const W = 640;
const H = 240;
const VOL_H = 44;

const CLASSES: { icon: IconName; label: string }[] = [
  { icon: 'markt', label: 'Aktien' },
  { icon: 'anleihe', label: 'Anleihen' },
  { icon: 'coin', label: 'AlphaCoins' },
  { icon: 'index', label: 'Indizes & ETFs' },
];

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'organisation', title: 'Unternehmen gründen', text: 'Als CEO führen, Kapital erhöhen, Anleihen ausgeben.' },
  { icon: 'bank', title: 'Zentralbank', text: 'Banken bieten im Zinstender – und bewegen den Leitzins.' },
  { icon: 'allianz', title: 'Allianzen', text: 'Mit anderen handeln, schreiben, abstimmen.' },
  { icon: 'miner', title: 'AlphaCoins schürfen', text: 'Den Miner ausbauen und Erfolge sammeln.' },
];

const BAND = [
  'Aktien',
  'Anleihen',
  'Repos',
  'AlphaCoins',
  'Indizes',
  'ETFs',
  'Optionsscheine',
  'Immobilien',
  'Zinstender',
  'Kapitalerhöhung',
  'Dividende',
  'Fusion',
  'Market Maker',
];

/**
 * Left side of the login page: headline, an animated candle chart (a seeded random walk, labelled as an
 * example – there is no public market data before the login), asset classes and what you do in the game.
 * Stands still with prefers-reduced-motion.
 */
export function LoginHero({ compact }: { compact: boolean }) {
  const still = useMediaQuery('(prefers-reduced-motion: reduce)');
  const cs = useCandles(still);
  const first = cs[0].open;
  const last = cs[cs.length - 1].close;
  const pct = (last / first - 1) * 100;

  return (
    <section className="lh" aria-labelledby="lh-title">
      <DS.Wordmark size={compact ? 'sm' : 'md'} />
      <div className="lh__intro">
        <p className="lh__eyebrow">Die Börsensimulation</p>
        <h2 id="lh-title" className="lh__title">
          Hier macht kein Computer die Kurse. <span className="lh__accent">Hier macht ihr sie.</span>
        </h2>
        {!compact && (
          <p className="lh__lead">
            Gründe Unternehmen, handle Aktien, Anleihen und AlphaCoins – jeder Preis entsteht allein aus dem Handel der
            Spieler.
          </p>
        )}
      </div>

      <figure className="lh__chart">
        <figcaption className="lh__cap">
          <span className="lh__label">Beispiel · Kursbild</span>
          <span className="lh__quote">
            <span className="lh__price">{last.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}&nbsp;€</span>
            <DS.PriceChange value={pct} variant="tag" size="sm" />
          </span>
        </figcaption>
        <CandleChart cs={cs} />
      </figure>

      {!compact && (
        <>
          <ul className="lh__classes" aria-label="Anlageklassen">
            {CLASSES.map((c) => (
              <li key={c.label}>
                <DS.Icon name={c.icon} size={18} />
                {c.label}
              </li>
            ))}
          </ul>
          <ul className="lh__features">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <span className="lh__ficon">
                  <DS.Icon name={f.icon} size={20} />
                </span>
                <span>
                  <b>{f.title}</b>
                  <span>{f.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className={`lh__band${still ? ' is-still' : ''}`} aria-hidden="true">
        <div className="lh__track">
          {[0, 1].map((k) => (
            <span key={k}>
              {BAND.map((w) => (
                <span key={w}>
                  {w}
                  <i>·</i>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Candles that keep coming: the last one moves every 350 ms, every fourth step a new one starts. */
function useCandles(still: boolean): Candle[] {
  const [state, setState] = useState(() => ({ cs: candles(COUNT, 11), rand: rng(29), tick: 0 }));
  useEffect(() => {
    if (still) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      setState((s) => {
        const tick = s.tick + 1;
        const cs = s.cs.slice();
        const lastC = cs[cs.length - 1];
        if (tick % 4 === 0) {
          cs.push(nextCandle(lastC.close, s.rand));
          cs.shift();
        } else {
          const close = Math.max(0.01, lastC.close * (1 + (s.rand() - 0.49) * 0.012));
          cs[cs.length - 1] = {
            ...lastC,
            close,
            high: Math.max(lastC.high, close),
            low: Math.min(lastC.low, close),
            volume: lastC.volume + s.rand() * 0.08,
          };
        }
        return { ...s, cs, tick };
      });
    }, 350);
    return () => clearInterval(id);
  }, [still]);
  return state.cs;
}

function CandleChart({ cs }: { cs: Candle[] }) {
  const [lo, hi] = priceRange(cs);
  const plotH = H - VOL_H - 8;
  const y = (p: number) => ((hi - p) / (hi - lo)) * plotH;
  const step = W / cs.length;
  const body = step * 0.62;
  const maxVol = Math.max(...cs.map((c) => c.volume));
  const last = cs[cs.length - 1];
  const lastY = y(last.close);

  return (
    <div className="lh__plot">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        {[0.2, 0.4, 0.6, 0.8].map((f) => (
          <line key={f} className="lh__grid" x1={0} x2={W} y1={plotH * f} y2={plotH * f} vectorEffect="non-scaling-stroke" />
        ))}
        {cs.map((c, i) => {
          const up = c.close >= c.open;
          const x = i * step + step / 2;
          const top = y(Math.max(c.open, c.close));
          const h = Math.max(1, Math.abs(y(c.open) - y(c.close)));
          const vh = (c.volume / maxVol) * VOL_H;
          return (
            <g key={i} className={up ? 'lh__c lh__c--up' : 'lh__c lh__c--down'}>
              <line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)} vectorEffect="non-scaling-stroke" />
              <rect x={x - body / 2} width={body} y={top} height={h} />
              <rect className="lh__vol" x={x - body / 2} width={body} y={H - vh} height={vh} />
            </g>
          );
        })}
        <line className="lh__last" x1={0} x2={W} y1={lastY} y2={lastY} vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="lh__dot" style={{ top: `${(lastY / H) * 100}%` }} />
    </div>
  );
}
