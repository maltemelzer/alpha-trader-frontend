import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { DS } from '../ds';
import {
  useBalanceSheets,
  useCompanyAchievements,
  useClaimCompanyAchievements,
  useCompanyHistory,
  useCompanyNews,
  useMainInterestRate,
  useUnclaimedCompanyAchievements,
  type CompanyProfile,
} from '../api/queries';
import { Plot } from '../charts/Plot';
import { translate } from '../lib/messages';
import { toPost } from '../news/derive';
import { achievementItems } from '../players/derive';
import { reserveIncome } from '../centralbank/derive';
import { developmentChart } from './charts';
import { ManagePanel } from './ManagePanel';
import { CeoPollButton } from './CeoPanels';
import { MarketMakerFacts } from './Sponsorships';
import { QuotePanel } from './QuotePanel';
import { ChronicleView, RankingView } from './ProfileViews';
import { Overview } from './CompanyOverview';
import { RANGES, type RangeKey } from './overview';
import type { Poll } from '../../design-system/components';
import { companyHref, PRESSE, presseOf, withQuery, ZAHLEN, zahlenOf } from './views';
import './CompanyPage.css';

/** URL writes of the company views: view and presentation in one step, other keys kept. */
function useQuery(fallback: string) {
  const [params, setParams] = useSearchParams();
  const set = useCallback(
    (patch: Record<string, string | undefined>) => setParams((prev) => withQuery(prev, patch, fallback), { replace: true }),
    [setParams, fallback],
  );
  return [params, set] as const;
}

/**
 * One company view of a stock page (views.ts): a card that fills the cell. „Zahlen“ and „Presse“ switch their
 * presentation in the card head. The data of each view loads only when it is shown.
 */
export function CompanyView({
  view,
  fallback,
  asin,
  company: c,
  polls,
  pollsLoading,
  onDone,
}: {
  view: string;
  /** default view of the page – never written to the URL */
  fallback: string;
  asin: string;
  company: CompanyProfile | undefined;
  polls: Poll[] | undefined;
  pollsLoading?: boolean;
  onDone: (text: string) => void;
}) {
  const [params, set] = useQuery(fallback);
  const isCeo = !!c?.ceo?.myUser;
  const zahlen = zahlenOf(params);
  const presse = presseOf(params);

  let title: string | undefined;
  let action: React.ReactNode = null;
  let body: React.ReactNode;
  switch (view) {
    case 'ueberblick': {
      const r = params.get('zeitraum');
      const range: RangeKey = RANGES.some((x) => x.value === r) ? (r as RangeKey) : '30T';
      body = <OverviewView asin={asin} company={c} polls={polls} range={range} onRange={(z) => set({ zeitraum: z })} />;
      break;
    }
    case 'zahlen':
      title = ZAHLEN.find((z) => z.value === zahlen)!.label;
      action = (
        <DS.SegmentedControl
          aria-label="Darstellung"
          size="sm"
          fullWidth={false}
          options={[...ZAHLEN]}
          value={zahlen}
          onChange={(z) => set({ ansicht: 'zahlen', zahlen: z })}
        />
      );
      body =
        zahlen === 'entwicklung' ? (
          <Development asin={asin} />
        ) : zahlen === 'einordnung' ? (
          <Ranking asin={asin} companyId={c?.id} selected={params.get('kennzahl')} onSelect={(k) => set({ ansicht: 'zahlen', zahlen: 'einordnung', kennzahl: k })} />
        ) : (
          <Sheets companyId={c?.id} selected={params.get('bilanz')} onSelect={(d) => set({ ansicht: 'zahlen', zahlen: 'bilanz', bilanz: String(d) })} />
        );
      break;
    case 'presse':
      title = presse === 'chronik' ? 'Chronik' : 'Pressemitteilungen';
      action = (
        <DS.SegmentedControl
          aria-label="Darstellung"
          size="sm"
          fullWidth={false}
          options={[...PRESSE]}
          value={presse}
          onChange={(p) => set({ ansicht: 'presse', presse: p })}
        />
      );
      body = presse === 'chronik' ? <ChronicleView companyId={c?.id} /> : <News companyId={c?.id} />;
      break;
    case 'abstimmungen':
      title = 'Abstimmungen';
      body = (
        <div className="company__pad company__polls">
          {c && !isCeo && (
            <div className="company__ceo-poll">
              <p className="company__note">
                {c.ceo?.username ? `Unzufrieden mit ${c.ceo.username}? ` : 'Das Unternehmen hat keinen CEO. '}
                Als Aktionär kannst du dich zur Wahl stellen.
              </p>
              <CeoPollButton company={c} currentWage={c.ceoEmploymentAgreement?.dailyWage} label="Als CEO bewerben" onDone={onDone} />
            </div>
          )}
          {pollsLoading ? <DS.Loading rows={3} /> : <DS.PollList polls={polls ?? []} emptyText="Keine laufenden Abstimmungen." />}
        </div>
      );
      break;
    case 'marketmaker': {
      title = 'Market Maker';
      // ?quote=ASIN: the CEO of a designated sponsor quotes one of its sponsored listings.
      const quoteAsin = params.get('quote');
      const quoting = isCeo && quoteAsin ? c?.sponsoredListings?.find((s) => s.listing.securityIdentifier === quoteAsin) : undefined;
      body = !c ? (
        <DS.Loading rows={4} />
      ) : quoting ? (
        <div className="company__pad">
          <QuotePanel
            key={quoting.listing.securityIdentifier}
            sponsorship={quoting}
            owner={c.securitiesAccountId}
            onBack={() => set({ quote: undefined })}
            onDone={onDone}
          />
        </div>
      ) : (
        <div className="company__pad">
          <MarketMakerFacts company={c} isCeo={isCeo} onQuote={(s) => set({ ansicht: 'marketmaker', quote: s.listing.securityIdentifier })} />
        </div>
      );
      break;
    }
    case 'bank':
      title = 'Bank';
      body = c?.companyCapabilities ? <BankFacts caps={c.companyCapabilities} isCeo={isCeo} asin={asin} /> : <DS.Loading rows={3} />;
      break;
    case 'erfolge':
      title = 'Erfolge';
      body = <Achievements company={c} isCeo={isCeo} />;
      break;
    case 'fuehren':
      title = 'Führen';
      body = c ? (
        <div className="company__pad">
          <ManagePanel company={c} />
        </div>
      ) : (
        <DS.Loading rows={4} />
      );
      break;
    default:
      return null;
  }

  return (
    <DS.Card title={title} titleAs="h2" action={action} flush className={`panel cv cv--${view}`}>
      <div className="cv__body">{body}</div>
    </DS.Card>
  );
}

function OverviewView({
  asin,
  company,
  polls,
  range,
  onRange,
}: {
  asin: string;
  company: CompanyProfile | undefined;
  polls: Poll[] | undefined;
  range: RangeKey;
  onRange: (r: RangeKey) => void;
}) {
  const history = useCompanyHistory(asin);
  return <Overview company={company} asin={asin} history={history.data} polls={polls} range={range} onRange={onRange} />;
}

function Development({ asin }: { asin: string }) {
  const history = useCompanyHistory(asin);
  return (
    <div className="company__chart">
      {history.data?.length ? (
        <Plot aria-label="Buchwert, Net Cash und Bargeld im Verlauf" figure={(t, w) => developmentChart(t, w, history.data!)} />
      ) : history.isLoading ? (
        <DS.Loading rows={6} />
      ) : (
        <DS.EmptyState compact as="h3" title="Noch keine Historie" />
      )}
    </div>
  );
}

function Ranking({ asin, companyId, selected, onSelect }: { asin: string; companyId: string | undefined; selected: string | null; onSelect: (k: string) => void }) {
  const history = useCompanyHistory(asin);
  return <RankingView companyId={companyId} selected={selected} asOf={history.data?.at(-1)?.date} onSelect={onSelect} />;
}

function Sheets({ companyId, selected, onSelect }: { companyId: string | undefined; selected: string | null; onSelect: (d: number) => void }) {
  const sheets = useBalanceSheets(companyId);
  if (sheets.isPending) return <DS.Loading rows={6} />;
  if (!sheets.data?.content.length) return <DS.EmptyState compact as="h3" title="Keine Bilanzen" />;
  return (
    <div className="company__pad">
      <DS.BalanceSheet sheets={sheets.data.content} selected={selected ? Number(selected) : undefined} onSelect={onSelect} />
    </div>
  );
}

function News({ companyId }: { companyId: string | undefined }) {
  const news = useCompanyNews(companyId);
  if (news.isPending) return <DS.Loading rows={4} />;
  if (!news.data?.content.length) return <DS.EmptyState compact as="h3" title="Keine Pressemitteilungen" />;
  return (
    <div className="company__pad">
      <DS.NewsFeed items={news.data.content.map(toPost)} hrefFor={(p) => `/zeitung/${p.id}`} />
    </div>
  );
}

function Achievements({ company: c, isCeo }: { company: CompanyProfile | undefined; isCeo: boolean }) {
  const achievements = useCompanyAchievements(c?.id);
  const unclaimed = useUnclaimedCompanyAchievements(c?.id, isCeo);
  const claim = useClaimCompanyAchievements(c?.id);
  const open = unclaimed.data ?? [];
  if (!c || achievements.isPending) return <DS.Loading label="Erfolge werden geladen" rows={4} />;
  return (
    <div className="company__pad">
      {(claim.one.isError || claim.all.isError) && <DS.Banner variant="error">Abholen fehlgeschlagen.</DS.Banner>}
      <DS.AchievementBoard
        achievements={achievementItems([...open, ...(achievements.data ?? []).filter((d) => !open.some((o) => o.id === d.id))], [], translate)}
        label="Erfolge des Unternehmens"
        openFirst={isCeo}
        onClaim={isCeo ? (a) => a.id && claim.one.mutate(a.id) : undefined}
        onClaimAll={isCeo && open.length > 1 ? () => claim.all.mutate() : undefined}
      />
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
        <DS.StatTile label="Einlage" value={caps.reserves ?? 0} compact hint="bei der Zentralbank" />
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
            <a href={`/zentralbank?ansicht=einlage&bank=${asin}`}>Einlage erhöhen</a>, Zins-Boost unter{' '}
            <a href={companyHref(asin, 'fuehren', { aktion: 'bank' })}>Führen → Bank</a>.{' '}
          </>
        ) : null}
        Alle Banken, Leitzins und Zinstender: <a href="/zentralbank">Zentralbank</a>.
      </p>
    </div>
  );
}
