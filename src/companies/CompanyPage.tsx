import { useNavigate, useParams, useSearchParams } from 'react-router';
import { DS } from '../ds';
import {
  useBalanceSheets,
  useCompanyAchievements,
  useClaimCompanyAchievements,
  useCompanyByAsin,
  useCompanyHistory,
  useCompanyNews,
  useCompanyPolls,
  useUnclaimedCompanyAchievements,
} from '../api/queries';
import { Plot } from '../charts/Plot';
import { useInternalLinks } from '../lib/useInternalLinks';
import { translate } from '../lib/messages';
import { toPost } from '../news/derive';
import { achievementItems } from '../players/derive';
import { developmentChart } from './charts';
import { ManagePanel } from './ManagePanel';
import './CompanyPage.css';

/**
 * Company profile (/unternehmen/:asin): header with key figures; development chart, balance sheet,
 * press releases, polls and achievements as tabs. The CEO also gets „Führen“ (corporate actions).
 * Price and trading live on the securities page.
 */
export function CompanyPage() {
  const { asin = '' } = useParams();
  const navigate = useNavigate();
  const onLinkClick = useInternalLinks();
  const [params, setParams] = useSearchParams();
  const company = useCompanyByAsin(asin);
  const c = company.data;
  const history = useCompanyHistory(asin);
  const sheets = useBalanceSheets(c?.id);
  const news = useCompanyNews(c?.id);
  const polls = useCompanyPolls(c?.id);
  const achievements = useCompanyAchievements(c?.id);
  const isCeo = !!c?.ceo?.myUser;
  const unclaimed = useUnclaimedCompanyAchievements(c?.id, isCeo);
  const claim = useClaimCompanyAchievements(c?.id);
  const sheetDate = params.get('bilanz') ? Number(params.get('bilanz')) : undefined;

  if (company.isError) {
    return (
      <div className="page">
        <DS.EmptyState title="Unternehmen nicht gefunden">Zu „{asin}“ gibt es kein Unternehmen.</DS.EmptyState>
      </div>
    );
  }
  const caps = c?.companyCapabilities;
  const open = unclaimed.data ?? [];
  const tab = params.get('ansicht') ?? 'entwicklung';

  const items = [
    {
      value: 'entwicklung',
      label: 'Entwicklung',
      content: (
        <div className="company__chart">
          {history.data?.length ? (
            <Plot aria-label="Buchwert, Net Cash und Bargeld im Verlauf" figure={(t, w) => developmentChart(t, w, history.data!)} />
          ) : history.isLoading ? (
            <DS.Loading rows={6} />
          ) : (
            <DS.EmptyState compact as="h3" title="Noch keine Historie" />
          )}
        </div>
      ),
    },
    {
      value: 'bilanz',
      label: 'Bilanz',
      count: sheets.data?.totalElements || undefined,
      content: sheets.data?.content.length ? (
        <div className="company__pad">
          <DS.BalanceSheet sheets={sheets.data.content} selected={sheetDate} onSelect={(d) => setParams({ ansicht: 'bilanz', bilanz: String(d) }, { replace: true })} />
        </div>
      ) : (
        <DS.EmptyState compact as="h3" title="Keine Bilanzen" />
      ),
    },
    {
      value: 'presse',
      label: 'Presse',
      count: news.data?.totalElements || undefined,
      content: news.data?.content.length ? (
        <div className="company__pad">
          <DS.NewsFeed items={news.data.content.map(toPost)} hrefFor={(p) => `/zeitung/${p.id}`} />
        </div>
      ) : (
        <DS.EmptyState compact as="h3" title="Keine Pressemitteilungen" />
      ),
    },
    {
      value: 'abstimmungen',
      label: 'Abstimmungen',
      count: polls.data?.length || undefined,
      content: (
        <div className="company__pad">
          <DS.PollList polls={polls.data ?? []} emptyText="Keine laufenden Abstimmungen." />
        </div>
      ),
    },
    {
      value: 'erfolge',
      label: 'Erfolge',
      count: c ? `${c.achievementCount ?? 0}/${c.achievementTotal ?? 0}` : undefined,
      content: (
        <div className="company__pad">
          {(claim.one.isError || claim.all.isError) && <DS.Banner variant="error">Abholen fehlgeschlagen.</DS.Banner>}
          <DS.AchievementBoard
            achievements={achievementItems(
              [...open, ...(achievements.data ?? []).filter((d) => !open.some((o) => o.id === d.id))],
              [],
              translate,
            )}
            label="Erfolge des Unternehmens"
            openFirst={isCeo}
            onClaim={isCeo ? (a) => a.id && claim.one.mutate(a.id) : undefined}
            onClaimAll={isCeo && open.length > 1 ? () => claim.all.mutate() : undefined}
          />
        </div>
      ),
    },
    ...(isCeo && c
      ? [
          {
            value: 'fuehren',
            label: 'Führen',
            content: <ManagePanel company={c} />,
          },
        ]
      : []),
  ];

  return (
    <div className="page company" onClick={onLinkClick}>
      <DS.ProfileHeader
        kind="company"
        kindLabel="Unternehmen"
        name={c?.name ?? '…'}
        logoUrl={c?.logoUrl ?? undefined}
        eyebrow={[<a key="a" href={`/wertpapier/${asin}`}>{asin}</a>, 'Aktie']}
        meta={[
          ...(c?.ceo?.username
            ? [
                <span key="ceo">
                  CEO <a href={`/spieler/${encodeURIComponent(c.ceo.username)}`}>{c.ceo.username}</a>
                </span>,
              ]
            : ['Kein CEO']),
          ...(c?.ceoEmploymentAgreement?.dailyWage != null ? [`Gehalt ${DS.format.money(c.ceoEmploymentAgreement.dailyWage, '€', 2, 'auto')} je Tag`] : []),
        ]}
        tags={[
          ...(caps?.bank ? [{ label: 'Banklizenz' }] : []),
          ...(c?.marketMakerPolicy === 'OPEN' ? [{ label: 'Market Maker offen' }] : []),
          ...(isCeo ? [{ label: 'Du bist CEO' }] : []),
        ]}
        actions={
          <DS.Button size="sm" onClick={() => navigate(`/wertpapier/${asin}`)}>
            Zum Wertpapier
          </DS.Button>
        }
        stats={[
          { label: 'Kurs', value: c?.lastPrice ? c.lastPrice.value : '–', sub: c?.marketCap ? `Marktkap. ${DS.format.money(c.marketCap, '€', 2, true)}` : undefined },
          { label: 'Buchwert', value: caps?.bookValue ?? '–', compact: true },
          { label: 'Net Cash', value: caps?.netCash ?? '–', compact: true },
          { label: 'Bargeld', value: c?.bankAccount?.cash ?? '–', compact: true },
        ]}
      />
      <DS.Card flush className="panel">
        <div className="panel__tabs">
          <DS.Tabs size="sm" aria-label="Unternehmen" items={items} value={tab} onChange={(v) => setParams({ ansicht: v }, { replace: true })} />
        </div>
      </DS.Card>
    </div>
  );
}
