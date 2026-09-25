import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { DS } from '../ds';
import {
  useBalanceSheets,
  useCompanyAchievements,
  useClaimCompanyAchievements,
  useCompanyByAsin,
  useMainInterestRate,
  useCompanyHistory,
  useCompanyNews,
  useCompanyPolls,
  useUnclaimedCompanyAchievements,
  type CompanyProfile,
} from '../api/queries';
import { Plot } from '../charts/Plot';
import { useInternalLinks } from '../lib/useInternalLinks';
import { translate } from '../lib/messages';
import { toPost } from '../news/derive';
import { achievementItems } from '../players/derive';
import { developmentChart } from './charts';
import { ManagePanel } from './ManagePanel';
import { CeoPollButton } from './CeoPanels';
import { MarketMakerFacts } from './Sponsorships';
import { reserveIncome } from '../centralbank/derive';
import './CompanyPage.css';

/**
 * Company profile (/unternehmen/:asin): header with key figures; development chart, balance sheet,
 * press releases, polls (with „Als CEO bewerben“), market makers and achievements as tabs. The CEO
 * also gets „Führen“ (corporate actions, market maker, salary, logo).
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
  const [done, setDone] = useState<string | null>(null);
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
        <div className="company__pad company__polls">
          {c && !isCeo && (
            <div className="company__ceo-poll">
              <p className="company__note">
                {c.ceo?.username ? `Unzufrieden mit ${c.ceo.username}? ` : 'Das Unternehmen hat keinen CEO. '}
                Als Aktionär kannst du dich zur Wahl stellen.
              </p>
              <CeoPollButton company={c} currentWage={c.ceoEmploymentAgreement?.dailyWage} label="Als CEO bewerben" onDone={setDone} />
            </div>
          )}
          <DS.PollList polls={polls.data ?? []} emptyText="Keine laufenden Abstimmungen." />
        </div>
      ),
    },
    ...(c
      ? [
          {
            value: 'marketmaker',
            label: 'Market Maker',
            count: (c.designatedSponsors?.length ?? 0) + (c.sponsoredListings?.length ?? 0) || undefined,
            content: <MarketMakerFacts company={c} isCeo={isCeo} />,
          },
        ]
      : []),
    ...(caps?.bank
      ? [
          {
            value: 'bank',
            label: 'Bank',
            content: <BankFacts caps={caps} isCeo={isCeo} asin={asin} />,
          },
        ]
      : []),
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
            : [c ? 'Kein CEO' : '\u00a0']),
          ...(c?.ceoEmploymentAgreement?.dailyWage != null ? [`Gehalt ${DS.format.money(c.ceoEmploymentAgreement.dailyWage, '€', 2, 'auto')} je Tag`] : []),
        ]}
        tags={[
          ...(caps?.bank ? [{ label: 'Banklizenz' }] : []),
          ...(c?.marketMakerPolicy === 'OPEN' ? [{ label: 'Market Maker offen' }] : []),
          ...(c?.sponsoredListings?.length ? [{ label: 'Designated Sponsor' }] : []),
          ...(isCeo ? [{ label: 'Du bist CEO' }] : []),
        ]}
        actions={
          <DS.Button size="sm" onClick={() => navigate(`/wertpapier/${asin}`)}>
            Zum Wertpapier
          </DS.Button>
        }
        stats={[
          { label: 'Kurs', value: c?.lastPrice ? c.lastPrice.value : '–', sub: c?.marketCap ? `Marktkap. ${DS.format.money(c.marketCap, '€', 2, true)}` : '\u00a0' },
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
      {done && c && (
        <DS.ToastRegion>
          <DS.Toast title={c.name} duration={5000} onClose={() => setDone(null)}>
            {done}
          </DS.Toast>
        </DS.ToastRegion>
      )}
    </div>
  );
}

/**
 * A bank at a glance, for everyone: reserves at the central bank, the interest they earn per day
 * at the reserve rate, and how much of its credit line (10 % of the reserves, via system bonds) it
 * uses. The CEO manages reserves and boost under „Führen“.
 */
function BankFacts({ caps, isCeo, asin }: { caps: NonNullable<CompanyProfile['companyCapabilities']>; isCeo: boolean; asin: string }) {
  const main = useMainInterestRate();
  const rate = main.data?.reserveInterestRate;
  const income = reserveIncome(caps.reserves, rate);
  const max = caps.maxCentralBankLoans ?? 0;
  const taken = caps.takenCentralBankLoans ?? 0;
  return (
    <div className="company__pad company__bank">
      <DS.StatGroup columns="repeat(3, minmax(0, 1fr))" aria-label="Bank">
        <DS.StatTile label="Zentralbankeinlage" value={caps.reserves ?? 0} compact hint="Bargeld bei der Zentralbank" />
        <DS.StatTile
          label="Zinsertrag pro Tag"
          value={income ?? '–'}
          compact
          hint={rate != null ? `Einlagezins ${rate.toLocaleString('de-DE', { minimumFractionDigits: 2 })} %, ohne Boost` : 'Einlagezins wird geladen'}
        />
        <DS.StatTile label="Kreditrahmen" value={max} compact hint="10 % der Einlage" />
      </DS.StatGroup>
      <DS.ProgressBar
        size="sm"
        variant="neutral"
        label="Kreditrahmen genutzt"
        value={max ? (taken / max) * 100 : 0}
        valueText={`${DS.format.money(taken, '€', 2, true)} von ${DS.format.money(max, '€', 2, true)}`}
        hint="Zentralbankkredit über Systemanleihen, Zins Leitzins + 1 %"
      />
      <p className="company__note">
        {isCeo ? (
          <>
            Einlage erhöhen und Zins-Boost unter <a href={`/unternehmen/${asin}?ansicht=fuehren&aktion=bank`}>Führen → Bank</a>. {' '}
          </>
        ) : null}
        Alle Banken, Leitzins und Zinstender: <a href="/zentralbank">Zentralbank</a>.
      </p>
    </div>
  );
}
