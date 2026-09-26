import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { DS, format } from '../ds';
import { useCounterOtcOrders, useMe, useMyCompanies, useOpenOrders, useOrderLogs, usePortfolio } from '../api/queries';
import { useInternalLinks } from '../lib/useInternalLinks';
import { useIsPhone } from '../lib/useMediaQuery';
import { MiniStats } from '../app/phone';
import { OpenOrders } from './OpenOrders';
import { OtcIncoming, type MyAccount } from './Otc';
import { OtcNewSheet } from './OtcNew';
import { incomingOtc, orderTotals, otcTotals } from './derive';
import './OrdersPage.css';

type View = 'offen' | 'ausgefuehrt' | 'otc';
const money = (n: number) => format.money(n, '€', 2, 'auto');
const VIEWS: View[] = ['offen', 'ausgefuehrt', 'otc'];

/**
 * Orders of the private account or a company run as CEO: key figures, open orders, executed trades,
 * and OTC – offers addressed to me (all my accounts) and my own OTC orders, plus a new OTC order.
 */
export function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const onLinkClick = useInternalLinks();
  const phone = useIsPhone();
  const me = useMe();
  const portfolio = usePortfolio();
  const companies = useMyCompanies(me.data?.id);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const myAccounts = useMemo<MyAccount[]>(
    () => [
      ...(portfolio.data
        ? [
            {
              id: portfolio.data.securitiesAccountId,
              name: 'Privat',
              privateAccount: true,
              cash: portfolio.data.cash,
            },
          ]
        : []),
      ...(companies.data ?? [])
        .filter((c) => c.securitiesAccountId)
        .map((c) => ({
          id: c.securitiesAccountId!,
          name: c.name ?? c.securityIdentifier ?? '',
          cash: c.bankAccount?.cash,
        })),
    ],
    [portfolio.data, companies.data],
  );
  const accounts = myAccounts.map((a) => ({ value: a.id, label: a.name }));
  const account = accounts.find((a) => a.value === params.get('depot'))?.value ?? accounts[0]?.value;
  const view: View = VIEWS.find((v) => v === params.get('ansicht')) ?? 'offen';
  const otcView = params.get('otc') === 'von-dir' ? 'von-dir' : 'an-dich';
  const newOtc = params.get('neu');
  // All changes of one interaction in one call (setSearchParams keeps only the last call per tick).
  const update = (changes: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(changes)) {
          if (v == null) next.delete(k);
          else next.set(k, v);
        }
        return next;
      },
      { replace: true },
    );

  const orders = useOpenOrders(account);
  const logs = useOrderLogs(account, 100);
  const totals = orderTotals(orders.data?.content ?? []);
  const ownOtc = (orders.data?.content ?? []).filter((o) => o.counterParty);

  const accountIds = useMemo(() => myAccounts.map((a) => a.id), [myAccounts]);
  const otc = useCounterOtcOrders(accountIds);
  const incoming = useMemo(
    () =>
      incomingOtc(
        myAccounts.map((a, i) => ({
          accountId: a.id,
          accountName: a.name,
          orders: otc.data[i],
        })),
      ),
    [myAccounts, otc.data],
  );
  const ot = otcTotals(incoming);

  const done = (ok: boolean, text: string) => {
    setToast({ ok, text });
    if (ok) update({ neu: null });
  };

  return (
    <div className="page orders" onClick={onLinkClick}>
      <DS.PageHeader
        size="md"
        title="Orders"
        meta={<span>{accounts.length > 1 ? 'Privat und Unternehmen' : 'Privatdepot'}</span>}
        actions={
          accounts.length > 1 ? (
            <DS.Select
              aria-label="Depot"
              size="sm"
              fullWidth={false}
              value={account}
              options={accounts}
              onChange={(e) => update({ depot: e.target.value })}
            />
          ) : undefined
        }
      />
      <div className="page__body orders__body">
        {phone ? (
          // Phone: one row of figures instead of a 2×2 tile block; the trade count sits on its tab.
          view === 'otc' ? (
            <MiniStats
              label="OTC-Angebote"
              items={[
                { label: 'An dich', value: ot.count.toLocaleString('de-DE') },
                { label: 'Kauf / Verk.', value: `${ot.toBuy.toLocaleString('de-DE')} / ${ot.toSell.toLocaleString('de-DE')}` },
                { label: 'Volumen', value: money(ot.volume) },
              ]}
            />
          ) : (
            <MiniStats
              label="Offene Orders"
              items={[
                { label: 'Offen', value: totals.count.toLocaleString('de-DE') },
                { label: `Kauf · ${totals.buys}`, value: money(totals.buyVolume) },
                { label: `Verkauf · ${totals.sells}`, value: money(totals.sellVolume) },
              ]}
            />
          )
        ) : view === 'otc' ? (
          <DS.StatGroup columns="repeat(auto-fit, minmax(150px, 1fr))" aria-label="OTC-Angebote">
            <DS.StatTile
              label="OTC an dich"
              value={ot.count.toLocaleString('de-DE')}
              hint={accounts.length > 1 ? 'alle Portfolios' : 'außerbörslich'}
            />
            <DS.StatTile label="Du kannst kaufen" value={ot.toBuy.toLocaleString('de-DE')} hint="Verkaufsangebote" />
            <DS.StatTile label="Du kannst verkaufen" value={ot.toSell.toLocaleString('de-DE')} hint="Kaufangebote" />
            <DS.StatTile
              label="Angebotenes Volumen"
              value={ot.volume}
              compact="auto"
              hint={`${ownOtc.length} eigene OTC-Orders`}
            />
          </DS.StatGroup>
        ) : (
          <DS.StatGroup columns="repeat(auto-fit, minmax(150px, 1fr))" aria-label="Offene Orders">
            <DS.StatTile label="Offene Orders" value={totals.count.toLocaleString('de-DE')} />
            <DS.StatTile
              label="Kaufvolumen"
              value={totals.buyVolume}
              compact="auto"
              hint={`${totals.buys} Kauforders`}
            />
            <DS.StatTile
              label="Verkaufsvolumen"
              value={totals.sellVolume}
              compact="auto"
              hint={`${totals.sells} Verkaufsorders`}
            />
            <DS.StatTile label="Trades (letzte 100)" value={(logs.data?.content.length ?? 0).toLocaleString('de-DE')} />
          </DS.StatGroup>
        )}
        <DS.Card flush className="panel">
          <div className="panel__tabs">
            <DS.Tabs
              size="sm"
              aria-label="Orders"
              value={view}
              onChange={(v) => update({ ansicht: v })}
              items={[
                {
                  value: 'offen',
                  label: 'Offen',
                  count: totals.count,
                  content: <OpenOrders securitiesAccountId={account} />,
                },
                {
                  value: 'ausgefuehrt',
                  label: 'Ausgeführt',
                  count: phone ? logs.data?.content.length || undefined : undefined,
                  content:
                    logs.isLoading || !account ? (
                      <DS.Loading rows={6} />
                    ) : (
                      <DS.TradeLog
                        entries={logs.data?.content ?? []}
                        securitiesAccountId={account}
                        hrefFor={(e) => `/wertpapier/${e.securityIdentifier}`}
                        empty={<DS.EmptyState compact as="h3" title="Noch keine Trades" />}
                      />
                    ),
                },
                {
                  value: 'otc',
                  label: 'OTC',
                  count: ot.count || undefined,
                  content: (
                    <div className="otc">
                      <div className="otc__bar">
                        <DS.SegmentedControl
                          size="sm"
                          fullWidth={false}
                          aria-label="OTC-Richtung"
                          value={otcView}
                          onChange={(v) => update({ otc: v === 'von-dir' ? v : null })}
                          options={[
                            {
                              value: 'an-dich',
                              label: `An dich (${ot.count})`,
                            },
                            {
                              value: 'von-dir',
                              label: `Von dir (${ownOtc.length})`,
                            },
                          ]}
                        />
                        <DS.Button size="sm" onClick={() => update({ neu: '1' })}>
                          Neue OTC-Order
                        </DS.Button>
                      </div>
                      {otcView === 'an-dich' ? (
                        <OtcIncoming
                          rows={incoming}
                          accounts={myAccounts}
                          loading={!myAccounts.length || otc.isLoading}
                          error={otc.isError}
                          onDone={done}
                        />
                      ) : (
                        <OpenOrders
                          securitiesAccountId={account}
                          filter={(o) => !!o.counterParty}
                          empty="Keine eigenen OTC-Orders in diesem Portfolio"
                        />
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </DS.Card>
      </div>
      <OtcNewSheet
        key={newOtc ?? 'closed'}
        open={!!newOtc}
        onClose={() => update({ neu: null })}
        accounts={myAccounts}
        asin={newOtc && newOtc !== '1' ? newOtc : undefined}
        onDone={done}
      />
      {toast && (
        <DS.ToastRegion>
          <DS.Toast
            variant={toast.ok ? 'info' : 'error'}
            title={toast.ok ? 'OTC-Order gesendet' : 'OTC-Order fehlgeschlagen'}
            duration={toast.ok ? 5000 : undefined}
            onClose={() => setToast(null)}
          >
            {toast.text}
          </DS.Toast>
        </DS.ToastRegion>
      )}
    </div>
  );
}
