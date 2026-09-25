import { useMemo, useState } from 'react';
import { DS, format } from '../ds';
import { useAccountPortfolio, useAddOrder, usePriceSpreads } from '../api/queries';
import { changeText, parseDe } from '../lib/format';
import {
  acceptParams,
  acceptProblem,
  counterAction,
  premiumPct,
  referencePrice,
  unitValue,
  verdict,
  type IncomingOtc,
} from './derive';

/** One of my securities accounts (private or a company run as CEO). */
export interface MyAccount {
  id: string;
  name: string;
  privateAccount?: boolean;
  cash?: number;
}

const SIDE = { BUY: 'Kaufen', SELL: 'Verkaufen' } as const;
const VERDICT = { good: 'günstig', fair: 'marktnah', poor: 'teuer' } as const;
const asinOf = (r: IncomingOtc) => r.order.listing?.securityIdentifier ?? r.order.securityIdentifier;

/**
 * Offer vs. market as a diverging bar around 0 (±25 % full scale) with „▲ +4,20 %“ and a verdict
 * from my side (buying below / selling above the market is „günstig“). Neutral colours: this is
 * a comparison, not a price move.
 */
export function PremiumBar({
  pct,
  myAction,
  reference,
  empty = 'kein Marktkurs',
}: {
  pct?: number;
  myAction: 'BUY' | 'SELL';
  /** compared with: „Brief“, „Geld“ or the last „Kurs“ */
  reference?: string;
  empty?: string;
}) {
  if (pct == null) return <span className="otc-prem otc-prem--none">{empty}</span>;
  const v = verdict(myAction, pct)!;
  const half = (Math.min(Math.abs(pct), 25) / 25) * 50; // share of the whole track; one half = 25 %
  return (
    <span className={`otc-prem otc-prem--${v}`}>
      <span className="otc-prem__track" aria-hidden="true">
        <span className={`otc-prem__bar ${pct < 0 ? 'is-neg' : 'is-pos'}`} style={{ width: `${half}%` }} />
      </span>
      <span className="otc-prem__txt">
        <span className="num">{changeText(pct)}</span>
        <small>
          {VERDICT[v]}
          {reference ? ` · ${reference}` : ''}
        </small>
      </span>
    </span>
  );
}

type Row = IncomingOtc & {
  myAction: 'BUY' | 'SELL';
  pct?: number;
  ref?: string;
  refPrice?: number;
  asin: string;
};

/** OTC offers addressed to my accounts, each with its distance to the market and „Ausführen“. */
export function OtcIncoming({
  rows,
  accounts,
  loading,
  error,
  onDone,
}: {
  rows: IncomingOtc[];
  accounts: MyAccount[];
  loading?: boolean;
  error?: boolean;
  onDone: (ok: boolean, text: string) => void;
}) {
  const asins = useMemo(() => [...new Set(rows.map(asinOf))], [rows]);
  const spreads = usePriceSpreads(asins);
  const [acceptId, setAcceptId] = useState<string | null>(null);

  const table: Row[] = rows.map((r) => {
    const myAction = counterAction(r.order.action);
    const ref = referencePrice(spreads[asinOf(r)], myAction);
    return {
      ...r,
      myAction,
      asin: asinOf(r),
      pct: premiumPct(r.order.price, ref?.price),
      ref: ref?.label,
      refPrice: ref?.price,
    };
  });
  // Looked up by id, so the dialog follows live spreads and closes when the offer is gone.
  const accept = table.find((r) => r.order.id === acceptId) ?? null;

  if (loading) return <DS.Loading rows={4} label="OTC-Angebote werden geladen" />;
  if (error) return <DS.Banner variant="error">OTC-Angebote konnten nicht geladen werden.</DS.Banner>;
  const multi = accounts.length > 1;
  return (
    <>
      <DS.DataTable
        className="otc-table"
        caption="OTC-Angebote an dich"
        density="sm"
        stack="auto"
        rows={table}
        rowKey={(r: Row) => r.order.id}
        defaultSort={{ key: 'creationDate', dir: 'desc' }}
        empty={
          <DS.EmptyState compact as="h3" title="Keine OTC-Angebote an dich">
            Richtet ein Spieler eine Order außerbörslich an eines deiner Portfolios, erscheint sie hier.
          </DS.EmptyState>
        }
        columns={[
          {
            key: 'security',
            label: 'Angebot',
            mobile: 'title',
            render: (r: Row) => (
              <span className="bnk-table__stock">
                <span className="bnk-table__name">
                  <a className="bnk-pos__link" href={`/wertpapier/${r.asin}`}>
                    {r.order.listing?.name ?? r.asin}
                  </a>
                </span>
                <span className="bnk-table__meta">
                  <span className="bnk-table__ticker">{r.asin}</span>
                  <span>von {r.order.ownerName ?? 'unbekannt'}</span>
                  {multi && <span>an {r.accountName}</span>}
                </span>
              </span>
            ),
          },
          {
            key: 'myAction',
            label: 'Du kannst',
            width: 104,
            render: (r: Row) => (
              <span className={`bnk-side ${r.myAction === 'BUY' ? 'is-buy' : 'is-sell'}`}>{SIDE[r.myAction]}</span>
            ),
          },
          {
            key: 'numberOfShares',
            label: 'Anteile',
            type: 'number',
            sortable: true,
            accessor: (r: Row) => r.order.numberOfShares,
            render: (r: Row) => r.order.numberOfShares.toLocaleString('de-DE'),
          },
          {
            key: 'price',
            label: 'Preis',
            type: 'number',
            sortable: true,
            accessor: (r: Row) => r.order.price ?? 0,
            render: (r: Row) =>
              r.order.type === 'LIMIT' && r.order.price != null ? (
                format.price(r.order.price, r.order.listing?.type)
              ) : (
                <span className="bnk-pos__none">Market</span>
              ),
          },
          {
            key: 'pct',
            label: 'Zum Markt',
            sortable: true,
            mobileWide: true,
            sortValue: (r: Row) => (r.pct == null ? Infinity : r.myAction === 'BUY' ? r.pct : -r.pct),
            render: (r: Row) => (
              <PremiumBar
                pct={r.pct}
                myAction={r.myAction}
                reference={r.ref}
                empty={r.order.type === 'LIMIT' ? 'kein Marktkurs' : 'Preis legst du fest'}
              />
            ),
          },
          {
            key: 'volume',
            label: 'Volumen',
            type: 'number',
            sortable: true,
            accessor: (r: Row) => r.order.volume ?? 0,
            render: (r: Row) => (r.order.volume != null ? <DS.Amount value={r.order.volume} compact /> : '–'),
          },
          {
            key: 'creationDate',
            label: 'Gültig',
            sortable: true,
            sortValue: (r: Row) => r.order.creationDate ?? 0,
            render: (r: Row) => (
              <span className="bnk-pos__stack is-left">
                {r.order.goodTillDate ? `bis ${format.dateTime(r.order.goodTillDate)}` : 'unbefristet'}
                <small>
                  {r.pending
                    ? `ab ${format.dateTime(r.order.goodAfterDate!)}`
                    : r.order.creationDate
                      ? `seit ${format.dateTime(r.order.creationDate)}`
                      : ' '}
                </small>
              </span>
            ),
          },
          {
            key: 'act',
            label: <span className="bnk-sr">Aktion</span>,
            mobileLabel: '',
            action: true,
            align: 'right',
            render: (r: Row) => (
              <DS.Button
                size="sm"
                disabled={r.pending}
                onClick={() => setAcceptId(r.order.id)}
                aria-label={`${SIDE[r.myAction]}: ${r.order.listing?.name ?? r.asin} ausführen`}
              >
                Ausführen
              </DS.Button>
            ),
          },
        ]}
      />
      {accept && (
        <OtcAcceptDialog
          row={accept}
          account={accounts.find((a) => a.id === accept.accountId)}
          onClose={() => setAcceptId(null)}
          onDone={(ok, text) => {
            if (ok) setAcceptId(null);
            onDone(ok, text);
          }}
        />
      )}
    </>
  );
}

/**
 * Confirmation before executing an offer: shares (partial fills allowed), price for MARKET offers,
 * volume, cash or shares afterwards, distance to the market. „Ausführen“ places the opposite order
 * addressed back to the offerer (acceptParams).
 */
function OtcAcceptDialog({
  row,
  account,
  onClose,
  onDone,
}: {
  row: Row;
  account?: MyAccount;
  onClose: () => void;
  onDone: (ok: boolean, text: string) => void;
}) {
  const { order, myAction } = row;
  const portfolio = useAccountPortfolio(row.accountId);
  const add = useAddOrder();
  const [sharesText, setSharesText] = useState(String(order.numberOfShares));
  const [priceText, setPriceText] = useState('');
  const isMarket = order.type !== 'LIMIT' || order.price == null;
  const listingType = order.listing?.type;

  const shares = parseDe(sharesText);
  const price = isMarket ? parseDe(priceText) : order.price!;
  // Bonds: volume/shares already contains the face value; for MARKET offers only the typed price is known.
  const unit = isMarket ? (price > 0 ? price : undefined) : unitValue(order);
  const cash = portfolio.data?.cash ?? account?.cash;
  const pos = portfolio.data?.positions.find((p) => p.securityIdentifier === row.asin);
  const freeShares = portfolio.data ? (pos ? pos.numberOfShares - pos.committedShares : 0) : undefined;
  const problem = acceptProblem({
    order,
    owner: row.accountId,
    shares,
    unit,
    cash,
    freeShares,
  });
  const volume = unit && shares > 0 ? shares * unit : undefined;
  const verb = myAction === 'BUY' ? 'Kauf' : 'Verkauf';
  const name = order.listing?.name ?? row.asin;

  const submit = () => {
    if (problem) return;
    add.mutate(
      acceptParams({
        order,
        owner: row.accountId,
        shares,
        price: isMarket ? price : undefined,
      }),
      {
        onSuccess: () =>
          onDone(
            true,
            `${verb} von ${shares.toLocaleString('de-DE')} Anteilen ${name} an ${order.ownerName ?? 'die Gegenpartei'} ausgeführt.`,
          ),
      },
    );
  };

  return (
    <DS.Dialog
      open
      size="md"
      eyebrow={`OTC · ${myAction === 'BUY' ? 'Verkaufsangebot' : 'Kaufangebot'} an dich`}
      title={`${name} ${myAction === 'BUY' ? 'kaufen' : 'verkaufen'}`}
      description={`${order.ownerName ?? 'Die Gegenpartei'} bietet dir ${order.numberOfShares.toLocaleString('de-DE')} Anteile außerbörslich an. Nur du kannst diese Order ausführen.`}
      dismissible={!add.isPending}
      onClose={() => !add.isPending && onClose()}
      actions={
        <>
          <DS.Button variant="secondary" onClick={onClose} disabled={add.isPending}>
            Abbrechen
          </DS.Button>
          <DS.Button variant="primary" loading={add.isPending} disabled={!!problem} onClick={submit}>
            {verb} ausführen
          </DS.Button>
        </>
      }
    >
      <div className="otc-accept">
        <div className="otc-accept__fields">
          <DS.Input
            label="Anteile"
            numeric
            stepper
            min={1}
            max={order.numberOfShares}
            step={1}
            value={sharesText}
            onChange={(e) => setSharesText(e.target.value)}
            hint={`Angeboten: ${order.numberOfShares.toLocaleString('de-DE')} · Teilausführung möglich`}
            error={problem && /Anteile|Zahl|Bargeld|Portfolio/.test(problem) ? problem : undefined}
          />
          {isMarket && (
            <DS.Input
              label="Dein Preis je Anteil"
              numeric
              suffix={listingType === 'BOND' || listingType === 'REPO' ? '%' : '€'}
              value={priceText}
              placeholder="0,00"
              onChange={(e) => setPriceText(e.target.value)}
              hint="Market-Angebot: Du legst den Preis fest."
              error={priceText.trim() && problem?.includes('Preis') ? problem : undefined}
            />
          )}
        </div>
        <div className="otc-accept__market">
          <span className="bnk-field__label">Zum Markt</span>
          <PremiumBar
            pct={isMarket ? premiumPct(price > 0 ? price : undefined, row.refPrice) : row.pct}
            myAction={myAction}
            reference={row.ref}
          />
        </div>
        <DS.SummaryList
          items={[
            ...(account ? [{ label: 'Portfolio', value: account.name }] : []),
            { label: 'Gegenpartei', value: order.ownerName ?? '–' },
            {
              label: 'Preis',
              value: price > 0 ? format.price(price, listingType) : '–',
            },
            {
              label: myAction === 'BUY' ? 'Volumen' : 'Erlös',
              value: volume ?? '–',
              total: true,
            },
            ...(myAction === 'BUY' && cash != null
              ? [
                  {
                    label: 'Bargeld danach',
                    value: cash - (volume ?? 0),
                    muted: true,
                  },
                ]
              : freeShares != null
                ? [
                    {
                      label: 'Freie Anteile danach',
                      value: Math.max(0, freeShares - (shares || 0)),
                      currency: '',
                      decimals: 0,
                      muted: true,
                    },
                  ]
                : []),
          ]}
        />
        {problem && !/Anteile|Zahl|Bargeld|Portfolio|Preis/.test(problem) && <DS.Banner variant="error">{problem}</DS.Banner>}
        {add.isError && <DS.Banner variant="error">Ausführen fehlgeschlagen: {add.error.message}</DS.Banner>}
      </div>
    </DS.Dialog>
  );
}
