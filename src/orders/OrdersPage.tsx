import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { DS } from '../ds';
import { useMe, useMyCompanies, useOpenOrders, useOrderLogs, usePortfolio } from '../api/queries';
import { OpenOrders } from './OpenOrders';
import { orderTotals } from './derive';
import './OrdersPage.css';

/** Orders of the private account or a company run as CEO: key figures, open orders, executed trades. */
export function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const me = useMe();
  const portfolio = usePortfolio();
  const companies = useMyCompanies(me.data?.id);

  const accounts = useMemo(
    () => [
      ...(portfolio.data ? [{ value: portfolio.data.securitiesAccountId, label: 'Privat' }] : []),
      ...(companies.data ?? [])
        .filter((c) => c.securitiesAccountId)
        .map((c) => ({ value: c.securitiesAccountId!, label: c.name ?? c.securityIdentifier ?? '' })),
    ],
    [portfolio.data, companies.data],
  );
  const account = accounts.find((a) => a.value === params.get('depot'))?.value ?? accounts[0]?.value;
  const view = params.get('ansicht') === 'ausgefuehrt' ? 'ausgefuehrt' : 'offen';
  const set = (key: string, v: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set(key, v);
        return next;
      },
      { replace: true },
    );

  const orders = useOpenOrders(account);
  const logs = useOrderLogs(account, 100);
  const totals = orderTotals(orders.data?.content ?? []);

  return (
    <div className="page orders">
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
              onChange={(e) => set('depot', e.target.value)}
            />
          ) : undefined
        }
      />
      <div className="page__body orders__body">
        <DS.StatGroup columns="repeat(auto-fit, minmax(150px, 1fr))" aria-label="Offene Orders">
          <DS.StatTile label="Offene Orders" value={totals.count.toLocaleString('de-DE')} />
          <DS.StatTile label="Kaufvolumen" value={totals.buyVolume} compact="auto" hint={`${totals.buys} Kauforders`} />
          <DS.StatTile label="Verkaufsvolumen" value={totals.sellVolume} compact="auto" hint={`${totals.sells} Verkaufsorders`} />
          <DS.StatTile label="Trades (letzte 100)" value={(logs.data?.content.length ?? 0).toLocaleString('de-DE')} />
        </DS.StatGroup>
        <DS.Card flush className="panel">
          <div className="panel__tabs">
            <DS.Tabs
              size="sm"
              aria-label="Orders"
              value={view}
              onChange={(v) => set('ansicht', v)}
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
              ]}
            />
          </div>
        </DS.Card>
      </div>
    </div>
  );
}
