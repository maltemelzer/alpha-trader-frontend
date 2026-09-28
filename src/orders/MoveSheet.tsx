import { useMemo, useState } from 'react';
import { DS, format } from '../ds';
import { fetchOpenOrders, useAccountPortfolio, useAddOrder, useDeleteOrder } from '../api/queries';
import { parseDe } from '../lib/format';
import {
  freeShares,
  moveOrders,
  movePrice,
  moveProblem,
  moveTotals,
  openMoveSell,
  unitCash,
  type MoveItem,
  type MovePriceMode,
} from './move';
import type { MyAccount } from './Otc';

type Status =
  | { state: 'wait' }
  | { state: 'run' }
  | { state: 'ok'; sellId?: string }
  | { state: 'open'; text: string }
  | { state: 'error'; text: string };

const STATUS_TEXT = { wait: 'wartet', run: 'läuft …', ok: 'umgebucht' } as const;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const count = (n: number) => n.toLocaleString('de-DE');
/** Company accounts hold thousands of positions (bonds): render the largest first, more on demand. */
const PAGE = 50;

/**
 * Move positions between my own accounts (private account ⇄ companies I run as CEO): choose source,
 * target, securities and shares; each security becomes an OTC pair – the source sells to the target,
 * then the target buys from the source at the same limit, which executes the sell (moveOrders).
 * Price 0,01 („symbolisch“, cash stays put) or the market price (the target pays the bid).
 */
export function MoveSheet({
  open,
  onClose,
  accounts,
  from: initialFrom,
  asin: initialAsin,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  accounts: MyAccount[];
  from?: string;
  asin?: string;
  onDone: (ok: boolean, text: string) => void;
}) {
  const [from, setFrom] = useState<string | undefined>(() => accounts.find((a) => a.id === initialFrom)?.id ?? accounts[0]?.id);
  const [to, setTo] = useState(() => accounts.find((a) => a.id !== from)?.id);
  const [mode, setMode] = useState<MovePriceMode>('symbolisch');
  const [picked, setPicked] = useState<Record<string, string>>(() => ({}));
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [step, setStep] = useState<'edit' | 'review' | 'run' | 'done'>('edit');
  const [status, setStatus] = useState<Record<string, Status>>({});
  const source = useAccountPortfolio(from);
  const target = useAccountPortfolio(to);
  const add = useAddOrder();
  const del = useDeleteOrder();
  const nameOf = (id?: string) => accounts.find((a) => a.id === id)?.name ?? '–';

  const positions = useMemo(
    () =>
      (source.data?.positions ?? [])
        .filter((p) => p.numberOfShares > 0)
        .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)),
    [source.data],
  );
  // Preselect the security from the URL once the source portfolio is there (all free shares).
  const [seeded, setSeeded] = useState(false);
  if (!seeded && initialAsin && positions.length) {
    const p = positions.find((x) => x.securityIdentifier === initialAsin);
    setSeeded(true);
    if (p) setPicked({ [initialAsin]: count(freeShares(p)) });
  }

  const items: (MoveItem & { value: number })[] = positions.map((p) => {
    const text = picked[p.securityIdentifier];
    return {
      asin: p.securityIdentifier,
      name: p.listing?.name ?? p.securityIdentifier,
      type: p.listing?.type ?? p.type,
      free: freeShares(p),
      shares: text == null ? 0 : parseDe(text),
      price: movePrice(p, mode),
      value: p.volume ?? 0,
    };
  });
  const chosen = items.filter((i) => picked[i.asin] != null);
  const cashTo = target.data?.cash ?? accounts.find((a) => a.id === to)?.cash;
  const problem = moveProblem({ from, to, items: chosen, cashTo });
  const totals = moveTotals(chosen);
  const maxValue = Math.max(1, ...items.map((i) => i.value));
  const q = query.trim().toLowerCase();
  const matches = q ? items.filter((i) => i.name.toLowerCase().includes(q) || i.asin.toLowerCase().includes(q)) : items;
  // Chosen rows stay visible even beyond the limit.
  const shown = matches.filter((i, n) => n < limit || picked[i.asin] != null);
  const busy = step === 'run';

  const toggle = (i: MoveItem, on: boolean) =>
    setPicked((prev) => {
      const next = { ...prev };
      if (on) next[i.asin] = count(i.free);
      else delete next[i.asin];
      return next;
    });
  const changeFrom = (id: string) => {
    setFrom(id);
    if (id === to) setTo(from);
    setPicked({});
    setLimit(PAGE);
  };
  const swap = () => {
    setFrom(to);
    setTo(from);
    setPicked({});
    setLimit(PAGE);
  };

  const run = async () => {
    if (problem || !from || !to) return;
    setStep('run');
    const list = chosen.map((i) => ({ ...i, price: i.price! }));
    const st: Record<string, Status> = Object.fromEntries(list.map((i) => [i.asin, { state: 'wait' }]));
    const put = (asin: string, s: Status) => {
      st[asin] = s;
      setStatus({ ...st });
    };
    setStatus({ ...st });
    for (const i of list) {
      put(i.asin, { state: 'run' });
      const [sell, buy] = moveOrders({ from, to, asin: i.asin, shares: i.shares, price: i.price });
      let sellId: string | undefined;
      try {
        const res = await add.mutateAsync(sell);
        sellId = (res as { id?: string } | undefined)?.id;
      } catch (e) {
        put(i.asin, { state: 'error', text: `Verkauf abgelehnt: ${(e as Error).message}` });
        continue;
      }
      try {
        await add.mutateAsync(buy);
        put(i.asin, { state: 'ok', sellId });
      } catch (e) {
        // Don't leave a lonely sell behind: withdraw it again.
        let text = `Kauf abgelehnt: ${(e as Error).message}`;
        try {
          const id = sellId ?? openMoveSell((await fetchOpenOrders(from)).content, { to, asin: i.asin, price: i.price })?.id;
          if (id) await del.mutateAsync(id);
          text += id ? ' – Verkaufsorder zurückgezogen.' : '';
        } catch {
          text += ' – Verkaufsorder liegt noch offen (OTC · Von dir).';
        }
        put(i.asin, { state: 'error', text });
      }
    }
    // Did every pair execute? A sell still open means the buy didn't match it (fully).
    const placed = list.filter((i) => st[i.asin].state === 'ok');
    if (placed.length) {
      await sleep(1500);
      try {
        const openOrders = (await fetchOpenOrders(from)).content;
        for (const i of placed) {
          const s = st[i.asin] as { sellId?: string };
          const left = s.sellId
            ? openOrders.find((o) => o.id === s.sellId)
            : openMoveSell(openOrders, { to, asin: i.asin, price: i.price });
          if (left)
            put(i.asin, {
              state: 'open',
              text: `${count(left.numberOfShares)} Anteile noch offen – unter „OTC · Von dir“ prüfen.`,
            });
        }
      } catch {
        /* the check is only a hint */
      }
    }
    setStep('done');
    const ok = list.filter((i) => st[i.asin].state === 'ok').length;
    onDone(
      ok === list.length,
      ok === list.length
        ? `${count(ok)} ${ok === 1 ? 'Wertpapier' : 'Wertpapiere'} von ${nameOf(from)} nach ${nameOf(to)} umgebucht.`
        : `${count(ok)} von ${count(list.length)} Wertpapieren umgebucht – Details im Umbuchen-Fenster.`,
    );
  };

  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }));
  const summary = (
    <p className="mv__sum">
      <span>
        {count(totals.count)} {totals.count === 1 ? 'Wertpapier' : 'Wertpapiere'} · {count(totals.count * 2)} Orders
      </span>
      <span>
        {nameOf(to)} zahlt <strong className="num">{format.money(totals.cost, '€', 2, 'auto')}</strong>
        {cashTo != null && <> · danach {format.money(cashTo - totals.cost, '€', 2, 'auto')}</>}
      </span>
    </p>
  );
  const button =
    step === 'edit' ? (
      <DS.Button variant="primary" fullWidth disabled={!!problem} onClick={() => setStep('review')}>
        {totals.count ? `${count(totals.count)} ${totals.count === 1 ? 'Wertpapier' : 'Wertpapiere'} umbuchen …` : 'Umbuchen …'}
      </DS.Button>
    ) : step === 'review' ? (
      <div className="mv__actions">
        <DS.Button variant="secondary" onClick={() => setStep('edit')}>
          Zurück
        </DS.Button>
        <DS.Button variant="primary" onClick={run}>
          Jetzt {count(totals.count * 2)} Orders senden
        </DS.Button>
      </div>
    ) : (
      <DS.Button variant="secondary" fullWidth disabled={busy} onClick={onClose}>
        {busy ? 'Wird umgebucht …' : 'Schließen'}
      </DS.Button>
    );
  const footer = (
    <div className="mv__foot">
      {summary}
      {button}
    </div>
  );

  return (
    <DS.Sheet open={open} onClose={() => !busy && onClose()} title="Zwischen eigenen Depots umbuchen" width={520} footer={open ? footer : undefined}>
      {open && (
        <div className="mv">
          <div className="mv__route">
            <DS.Select
              label="Von"
              value={from}
              options={accountOptions}
              disabled={step !== 'edit'}
              onChange={(e) => changeFrom(e.target.value)}
            />
            <DS.Button variant="ghost" className="mv__swap" aria-label="Richtung tauschen" title="Richtung tauschen" onClick={swap} disabled={step !== 'edit'}>
              ⇄
            </DS.Button>
            <DS.Select
              label="Nach"
              value={to}
              options={accountOptions.map((o) => ({ ...o, disabled: o.value === from }))}
              disabled={step !== 'edit'}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          {step === 'edit' ? (
            <>
              <div className="mv__price">
                <DS.SegmentedControl
                  size="sm"
                  label="Preis"
                  value={mode}
                  onChange={(v) => setMode(v as MovePriceMode)}
                  options={[
                    { value: 'symbolisch', label: 'Symbolisch 0,01' },
                    { value: 'kurs', label: 'Zum Geldkurs' },
                  ]}
                />
                <p className="mv__hint">
                  {mode === 'symbolisch'
                    ? `${nameOf(to)} zahlt 0,01 je Anteil – wie die Übertragungen im Handelslog. Bei Milliarden Anteilen kommt trotzdem ein Betrag zusammen.`
                    : `${nameOf(to)} zahlt ${nameOf(from)} den Geldkurs (sonst den letzten Kurs).`}
                </p>
              </div>
              {positions.length > 8 && (
                <DS.Input
                  label="Wertpapier suchen"
                  type="search"
                  placeholder="Name oder ASIN"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              )}
              <div className="mv__list" role="group" aria-label={`Positionen in ${nameOf(from)}`}>
                {source.isLoading ? (
                  <DS.Loading rows={5} label="Positionen werden geladen" />
                ) : !positions.length ? (
                  <DS.EmptyState compact as="h3" title={`${nameOf(from)} hält keine Wertpapiere`} />
                ) : (
                  shown.map((i) => {
                    const on = picked[i.asin] != null;
                    const share = on && i.free > 0 && i.shares > 0 ? Math.min(1, i.shares / i.free) : 0;
                    return (
                      <div key={i.asin} className={`mv__row${on ? ' is-on' : ''}`}>
                        <DS.Checkbox
                          label={i.name}
                          hint={
                            <>
                              <span className="mv__asin">{i.asin}</span> · {count(i.free)} frei
                            </>
                          }
                          checked={on}
                          disabled={i.free < 1}
                          onChange={(e) => toggle(i, e.target.checked)}
                        />
                        <span className="mv__value">
                          <DS.Amount value={i.value} compact />
                          <span className="mv__bar" aria-hidden="true">
                            <span style={{ width: `${(i.value / maxValue) * 100}%` }} />
                          </span>
                        </span>
                        {on && (
                          <div className="mv__shares">
                            <DS.Input
                              aria-label={`Anteile ${i.name}`}
                              numeric
                              size="sm"
                              value={picked[i.asin]}
                              onChange={(e) => setPicked((prev) => ({ ...prev, [i.asin]: e.target.value }))}
                              suffix={`von ${count(i.free)}`}
                            />
                            <DS.ProgressBar
                              value={share * 100}
                              size="sm"
                              variant="neutral"
                              showValue={false}
                              aria-label="Anteil der freien Anteile"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                {matches.length > shown.length && (
                  <div className="mv__more">
                    <span>
                      {count(matches.length - shown.length)} weitere, kleinere Positionen
                    </span>
                    <DS.Button size="sm" variant="ghost" onClick={() => setLimit((n) => n + PAGE)}>
                      {count(Math.min(PAGE, matches.length - shown.length))} mehr zeigen
                    </DS.Button>
                  </div>
                )}
              </div>
              {chosen.length > 0 && problem && <DS.Banner variant="error">{problem}</DS.Banner>}
            </>
          ) : (
            <ul className="mv__review" aria-label="Umbuchungen">
              {chosen.map((i) => {
                const s = status[i.asin];
                return (
                  <li key={i.asin} className={`mv__item${s ? ` is-${s.state}` : ''}`}>
                    <span className="mv__item-main">
                      <strong>{i.name}</strong>
                      <span className="mv__item-meta">
                        {count(i.shares)} Anteile zu {format.price(i.price!, i.type)}
                        {mode === 'kurs' && <> = {format.money(i.shares * unitCash(i.price!), '€', 2, 'auto')}</>}
                      </span>
                      {(s?.state === 'error' || s?.state === 'open') && <span className="mv__item-err">{s.text}</span>}
                    </span>
                    <span className="mv__item-state">
                      {!s ? '2 Orders' : s.state === 'error' ? '✕ Fehler' : s.state === 'open' ? 'offen' : (s.state === 'ok' ? '✓ ' : '') + STATUS_TEXT[s.state]}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {step === 'review' && (
            <DS.Banner title={`${nameOf(from)} → ${nameOf(to)}`}>
              Je Wertpapier verkauft {nameOf(from)} außerbörslich an {nameOf(to)}, danach kauft {nameOf(to)} mit
              demselben Limit von {nameOf(from)} – das führt den Verkauf aus. Scheitert der Kauf, wird der Verkauf
              zurückgezogen.
            </DS.Banner>
          )}

        </div>
      )}
    </DS.Sheet>
  );
}
