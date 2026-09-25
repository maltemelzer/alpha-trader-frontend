import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { DS } from '../ds';
import {
  useCompanyDevelopment,
  useEmpireShares,
  useMe,
  useMyCompanies,
  useMyIndexes,
  useOrderLogs,
  usePortfolio,
  useSuggestions,
  useTakeovers,
} from '../api/queries';
import { useMediaQuery } from '../lib/useMediaQuery';
import { OpenOrders } from '../orders/OpenOrders';
import { Performance } from './PerformancePanel';
import { suggestionHref } from './derive';
import { MyIndexes } from './MyIndexes';
import { translate } from '../lib/messages';
import type { PortfolioView } from '../../vendor/bankiersgruen';
import './OrganisationPage.css';

const empty = (title: string, text?: string) => (
  <DS.EmptyState compact as="h3" title={title}>
    {text}
  </DS.EmptyState>
);

/**
 * „Meine Organisation“ (game: Mein Imperium) – the player's home.
 * Wide: portfolio + [Positionen | Orders | Trades] left, suggestions + [Unternehmen | Beteiligungen | Übernahmen] right.
 * Narrow: portfolio, then one card with all sections as tabs.
 */
export function OrganisationPage() {
  const navigate = useNavigate();
  const isWide = useMediaQuery('(min-width: 1100px)');
  const [params, setParams] = useSearchParams();

  const me = useMe();
  const portfolio = usePortfolio();
  const account = portfolio.data?.securitiesAccountId;
  const suggestions = useSuggestions();
  const logs = useOrderLogs(account);
  const development = useCompanyDevelopment();
  const shares = useEmpireShares();
  const takeovers = useTakeovers();
  const ceo = useMyCompanies(me.data?.id);
  const myIndexes = useMyIndexes();

  const positions = useMemo(() => portfolio.data?.positions ?? [], [portfolio.data]);
  const names = useMemo(
    () => Object.fromEntries(positions.map((p) => [p.securityIdentifier, p.listing?.name ?? p.securityIdentifier])),
    [positions],
  );
  const href = (asin: string) => `/wertpapier/${asin}`;

  const summaryView = portfolio.data ? (
    <DS.PortfolioSummary portfolio={portfolio.data as PortfolioView} label="Buchwert" as="p" />
  ) : (
    // Same height as the summary, so the cards below do not jump when it arrives.
    <DS.Skeleton variant="block" height={225} />
  );

  const tabs = {
    uebersicht: { label: 'Übersicht', content: <div className="org-pad">{summaryView}</div> },
    positionen: {
      label: 'Positionen',
      count: positions.length,
      content: portfolio.isLoading ? (
        <DS.Loading rows={5} />
      ) : (
        <DS.PositionTable
          positions={positions as NonNullable<PortfolioView['positions']>}
          density="sm"
          hrefFor={(p) => href(p.listing.securityIdentifier)}
          onTrade={(t) => navigate(href(t.position.listing.securityIdentifier))}
          empty={empty('Keine Positionen', 'Gekaufte Wertpapiere erscheinen hier.')}
        />
      ),
    },
    orders: { label: 'Offene Orders', content: <OpenOrders securitiesAccountId={account} density="sm" /> },
    trades: {
      label: 'Trades',
      content: (
        logs.isLoading || !account ? (
          <DS.Loading rows={5} />
        ) : (
          <DS.TradeLog
            entries={logs.data?.content ?? []}
            securitiesAccountId={account}
            names={names}
            density="sm"
            hrefFor={(e) => href(e.securityIdentifier)}
            empty={empty('Noch keine Trades')}
          />
        )
      ),
    },
    performance: { label: 'Performance', content: <Performance /> },
    vorschlaege: {
      label: 'Vorschläge',
      count: suggestions.data?.content.length || undefined,
      content: <Suggestions data={suggestions.data?.content} loading={suggestions.isLoading} />,
    },
    unternehmen: {
      label: 'Unternehmen',
      count: development.data?.content.length || undefined,
      content: development.isLoading ? (
        <DS.Loading rows={4} />
      ) : (
        <DS.CompanyDevelopment
          companies={development.data?.content ?? []}
          density="sm"
          hrefFor={(c) => `/unternehmen/${c.securityIdentifier}`}
          onFound={() => navigate('/unternehmen/gruenden')}
          empty={empty('Kein Unternehmen', 'Als CEO geführte Unternehmen erscheinen hier.')}
        />
      ),
    },
    indizes: {
      label: 'Indizes',
      count: myIndexes.data?.length || undefined,
      content: (
        <div className="org-pad">
          <MyIndexes />
        </div>
      ),
    },
    beteiligungen: {
      label: 'Beteiligungen',
      content: (
        <div className="org-pad">
          <DS.ShareList
            items={shares.data?.content ?? []}
            hrefFor={(i) => href(i.listing.securityIdentifier)}
            emptyTitle="Keine Beteiligungen"
            emptyText="Anteile an Unternehmen über alle Portfolios."
          />
        </div>
      ),
    },
    uebernahmen: {
      label: 'Übernahmen',
      content: (
        <div className="org-pad">
          <p className="org-note">Unternehmen, bei denen dir am wenigsten zur Mehrheit fehlt.</p>
          <DS.ShareList items={takeovers.data?.content ?? []} hrefFor={(i) => href(i.listing.securityIdentifier)} />
        </div>
      ),
    },
  };
  type Key = keyof typeof tabs;
  const tabItems = (keys: Key[]) => keys.map((k) => ({ value: k, ...tabs[k] }));
  const leftKeys: Key[] = isWide
    ? ['positionen', 'performance', 'orders', 'trades']
    : ['uebersicht', 'positionen', 'performance', 'orders', 'trades', 'vorschlaege', 'unternehmen', 'indizes', 'beteiligungen', 'uebernahmen'];
  const rightKeys: Key[] = ['unternehmen', 'indizes', 'beteiligungen', 'uebernahmen'];
  const pick = (keys: Key[], param: string) => {
    const v = params.get(param) as Key | null;
    return v && keys.includes(v) ? v : keys[0];
  };
  const setTab = (param: string) => (v: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set(param, v);
        return next;
      },
      { replace: true },
    );

  const ceoCount = ceo.data?.length ?? 0;
  const leftTab = pick(leftKeys, 'ansicht');
  // The performance charts need the height: on wide screens they take the summary card's place.
  const focus = isWide && leftTab === 'performance';
  return (
    <div className={`page org${isWide ? ' org--wide' : ''}${focus ? ' org--focus' : ''}`}>
      <DS.PageHeader
        size="md"
        title="Meine Organisation"
        meta={
          <>
            <span>{me.data?.username}</span>
            <span>{ceoCount ? `${ceoCount} Unternehmen als CEO` : 'Privatanleger'}</span>
          </>
        }
        actions={
          <>
            <DS.Button variant="secondary" size="sm" onClick={() => navigate('/bank')}>
              Überweisung
            </DS.Button>
            <DS.Button variant="primary" size="sm" onClick={() => navigate('/markt')}>
              Order aufgeben
            </DS.Button>
          </>
        }
      />
      <div className="page__body org__body">
        <div className="page__col org__left">
          {isWide && !focus && (
            <DS.Card title="Privatportfolio" className="org__summary">
              {summaryView}
            </DS.Card>
          )}
          <DS.Card flush className="panel">
            <div className="panel__tabs">
              <DS.Tabs
                size="sm"
                aria-label="Portfolio"
                items={tabItems(leftKeys)}
                value={leftTab}
                onChange={setTab('ansicht')}
              />
            </div>
          </DS.Card>
        </div>
        {isWide && (
          <div className="page__col org__right">
            <DS.Card title="Vorschläge" className="panel org__suggestions">
              <div className="panel__fill scroll">
                <Suggestions data={suggestions.data?.content} loading={suggestions.isLoading} />
              </div>
            </DS.Card>
            <DS.Card flush className="panel">
              <div className="panel__tabs">
                <DS.Tabs
                  size="sm"
                  aria-label="Unternehmen und Beteiligungen"
                  items={tabItems(rightKeys)}
                  value={pick(rightKeys, 'rechts')}
                  onChange={setTab('rechts')}
                />
              </div>
            </DS.Card>
          </div>
        )}
      </div>
    </div>
  );

}

type SuggestionItems = React.ComponentProps<typeof DS.SuggestionList>['suggestions'];

function Suggestions({ data, loading }: { data?: SuggestionItems; loading: boolean }) {
  const navigate = useNavigate();
  if (loading) return <DS.Loading rows={3} />;
  if (!data?.length) return empty('Keine Vorschläge');
  const items = data.slice(0, 5).map((s) => ({ ...s, text: translate(s.text) }));
  return <DS.SuggestionList suggestions={items} onAction={(s) => navigate(suggestionHref(s))} />;
}
