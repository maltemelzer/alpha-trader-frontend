import { useMemo, useState } from 'react';
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
import { useIsPhone, useMediaQuery } from '../lib/useMediaQuery';
import { OpenOrders } from '../orders/OpenOrders';
import { Performance } from './PerformancePanel';
import { suggestionHref } from './derive';
import { MyIndexes } from './MyIndexes';
import { ViewPicker } from '../app/phone';
import { QuickTransfer } from '../me/TransferSheet';
import { translate } from '../lib/messages';
import type { PortfolioView } from '../../design-system/components';
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
 * Phone: „Ansicht ▾“ (sheet with all ten views) + „Aktionen“ in one row, the view fills the rest.
 */
export function OrganisationPage() {
  const navigate = useNavigate();
  const isWide = useMediaQuery('(min-width: 1100px)');
  const phone = useIsPhone();
  const [params, setParams] = useSearchParams();
  const [sending, setSending] = useState(false);

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
    uebersicht: {
      label: 'Übersicht',
      description: 'Buchwert, Bargeld und Aufteilung',
      content: phone ? (
        <div className="org-pad org-home">
          {summaryView}
          {/* the page's actions in the thumb zone of the home view (elsewhere: „Aktionen“ above) */}
          <div className="org-home__actions">
            <DS.Button variant="secondary" size="lg" onClick={() => setSending(true)}>
              Überweisung
            </DS.Button>
            <DS.Button variant="primary" size="lg" onClick={() => navigate('/markt')}>
              Order aufgeben
            </DS.Button>
          </div>
        </div>
      ) : (
        <div className="org-pad">{summaryView}</div>
      ),
    },
    positionen: {
      label: 'Positionen',
      description: 'Deine Wertpapiere mit Kurs, Einstand und G/V',
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
    orders: { label: 'Offene Orders', description: 'Noch nicht ausgeführte Orders, löschen', content: <OpenOrders securitiesAccountId={account} density="sm" /> },
    trades: {
      label: 'Trades',
      description: 'Zuletzt ausgeführte Käufe und Verkäufe',
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
    performance: { label: 'Performance', description: 'Buchgewinn je Position, realisierte Gewinne', content: <Performance /> },
    vorschlaege: {
      label: 'Vorschläge',
      description: 'Was du als Nächstes tun kannst',
      count: suggestions.data?.content.length || undefined,
      content: <Suggestions data={suggestions.data?.content} loading={suggestions.isLoading} />,
    },
    unternehmen: {
      label: 'Unternehmen',
      description: 'Als CEO geführte Unternehmen, gründen',
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
      description: 'Deine eigenen Indizes, löschen',
      count: myIndexes.data?.length || undefined,
      content: (
        <div className="org-pad">
          <MyIndexes />
        </div>
      ),
    },
    beteiligungen: {
      label: 'Beteiligungen',
      description: 'Anteile an Unternehmen über alle Portfolios',
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
      description: 'Wo dir am wenigsten zur Mehrheit fehlt',
      content: (
        <div className="org-pad">
          <p className="org-note">Unternehmen, bei denen dir am wenigsten zur Mehrheit fehlt.</p>
          <DS.ShareList items={takeovers.data?.content ?? []} hrefFor={(i) => href(i.listing.securityIdentifier)} />
        </div>
      ),
    },
  };
  type Key = keyof typeof tabs;
  type Tab = { label: string; description: string; count?: number; content: React.ReactNode };
  const tabOf = (k: Key): Tab => tabs[k];
  const tabItems = (keys: Key[]) => keys.map((k) => ({ value: k, label: tabOf(k).label, count: tabOf(k).count, content: tabOf(k).content }));
  const leftKeys: Key[] = isWide
    ? ['positionen', 'performance', 'orders', 'trades']
    : ['uebersicht', 'positionen', 'performance', 'orders', 'trades', 'vorschlaege', 'unternehmen', 'indizes', 'beteiligungen', 'uebernahmen'];
  const rightKeys: Key[] = ['unternehmen', 'indizes', 'beteiligungen', 'uebernahmen'];
  const pick = (keys: Key[], param: string) => {
    // Links to a right-hand tab of the wide layout (?rechts=indizes) open that view on narrower screens.
    const v = (params.get(param) ?? (isWide ? null : params.get('rechts'))) as Key | null;
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
    <div className={`page org${isWide ? ' org--wide' : ''}${focus ? ' org--focus' : ''}${phone ? ' org--phone' : ''}`}>
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
          phone ? undefined : (
          <>
            <DS.Button variant="secondary" size="sm" onClick={() => setSending(true)}>
              Überweisung
            </DS.Button>
            <DS.Button variant="primary" size="sm" onClick={() => navigate('/markt')}>
              Order aufgeben
            </DS.Button>
          </>
          )
        }
      />
      {phone && (
        <div className="ph-bar">
          <ViewPicker
            views={leftKeys.map((k) => ({ value: k, label: tabOf(k).label, description: tabOf(k).description, count: tabOf(k).count }))}
            value={leftTab}
            onChange={setTab('ansicht')}
          />
          <DS.DropdownMenu
            label="Aktionen"
            size="lg"
            align="end"
            items={[
              { label: 'Überweisung', description: 'Geld an ein Konto senden', onSelect: () => setSending(true) },
              { label: 'Order aufgeben', description: 'Wertpapier im Markt suchen', onSelect: () => navigate('/markt') },
            ]}
          />
        </div>
      )}
      <div className="page__body org__body">
        <div className="page__col org__left">
          {isWide && !focus && (
            <DS.Card title="Privatportfolio" className="org__summary">
              {summaryView}
            </DS.Card>
          )}
          <DS.Card flush className="panel">
            {phone ? (
              <div className={`org__view${leftTab === 'performance' ? ' org__view--fill' : ''}`} role="region" aria-label={tabs[leftTab].label}>
                {tabs[leftTab].content}
              </div>
            ) : (
              <div className="panel__tabs">
                <DS.Tabs
                  size="sm"
                  aria-label="Portfolio"
                  items={tabItems(leftKeys)}
                  value={leftTab}
                  onChange={setTab('ansicht')}
                />
              </div>
            )}
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
      <QuickTransfer open={sending} onClose={() => setSending(false)} />
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
