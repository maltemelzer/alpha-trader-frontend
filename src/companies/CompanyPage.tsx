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
import { useIsPhone } from '../lib/useMediaQuery';
import { PhoneProfile, ScrollTabs } from '../app/phone';
import { translate } from '../lib/messages';
import { toPost } from '../news/derive';
import { achievementItems } from '../players/derive';
import { developmentChart } from './charts';
import { ManagePanel } from './ManagePanel';
import { CeoPollButton } from './CeoPanels';
import { MarketMakerFacts } from './Sponsorships';
import { QuotePanel } from './QuotePanel';
import { reserveIncome } from '../centralbank/derive';
import { ChronicleView, RankingView } from './ProfileViews';
import { Overview } from './CompanyOverview';
import { RANGES, type RangeKey } from './overview';
import './CompanyPage.css';

/**
 * Company profile (/unternehmen/:asin): header with key figures; overview (?ansicht=ueberblick, default,
 * ?zeitraum=30T|90T), development chart, ranking among
 * all companies (?ansicht=einordnung&kennzahl=), balance sheet, press releases, chronicle, polls (with „Als CEO bewerben“), market makers and achievements as tabs. The CEO
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
  const isPhone = useIsPhone();

  if (company.isError) {
    return (
      <div className="page">
        <DS.EmptyState title="Unternehmen nicht gefunden">Zu „{asin}“ gibt es kein Unternehmen.</DS.EmptyState>
      </div>
    );
  }
  const caps = c?.companyCapabilities;
  const open = unclaimed.data ?? [];
  const tab = params.get('ansicht') ?? 'ueberblick';
  const rangeParam = params.get('zeitraum');
  const range: RangeKey = RANGES.some((r) => r.value === rangeParam) ? (rangeParam as RangeKey) : '30T';
  // ?quote=ASIN: the CEO of a designated sponsor quotes one of its sponsored listings.
  const quoteAsin = params.get('quote');
  const quoting = isCeo && quoteAsin ? c?.sponsoredListings?.find((s) => s.listing.securityIdentifier === quoteAsin) : undefined;

  const items = [
    {
      value: 'ueberblick',
      label: 'Überblick',
      description: 'Kurs gegen Buchwert, Einordnung, Anteilseigner, Termine',
      content: (
        <Overview
          company={c}
          asin={asin}
          history={history.data}
          polls={polls.data}
          range={range}
          onRange={(r) => setParams({ ansicht: 'ueberblick', zeitraum: r }, { replace: true })}
        />
      ),
    },
    {
      value: 'entwicklung',
      label: 'Entwicklung',
      description: 'Buchwert, Net Cash und Bargeld im Verlauf',
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
      value: 'einordnung',
      label: 'Einordnung',
      description: 'Wo das Unternehmen unter allen steht',
      content: (
        <RankingView
          companyId={c?.id}
          selected={params.get('kennzahl')}
          asOf={history.data?.at(-1)?.date}
          onSelect={(k) => setParams({ ansicht: 'einordnung', kennzahl: k }, { replace: true })}
        />
      ),
    },
    {
      value: 'bilanz',
      label: 'Bilanz',
      description: 'Tagesbilanzen',
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
      description: 'Pressemitteilungen des Unternehmens',
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
      value: 'chronik',
      label: 'Chronik',
      description: 'Ereignisse seit der Gründung',
      content: <ChronicleView companyId={c?.id} />,
    },
    {
      value: 'abstimmungen',
      label: 'Abstimmungen',
      description: 'Laufende Abstimmungen, als CEO bewerben',
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
            description: 'Designated Sponsors und betreute Wertpapiere',
            count: (c.designatedSponsors?.length ?? 0) + (c.sponsoredListings?.length ?? 0) || undefined,
            content: quoting ? (
              <div className="company__pad">
                <QuotePanel
                  key={quoting.listing.securityIdentifier}
                  sponsorship={quoting}
                  owner={c.securitiesAccountId}
                  onBack={() => setParams({ ansicht: 'marketmaker' }, { replace: true })}
                  onDone={setDone}
                />
              </div>
            ) : (
              <MarketMakerFacts
                company={c}
                isCeo={isCeo}
                onQuote={(s) => setParams({ ansicht: 'marketmaker', quote: s.listing.securityIdentifier }, { replace: true })}
              />
            ),
          },
        ]
      : []),
    ...(caps?.bank
      ? [
          {
            value: 'bank',
            label: 'Bank',
            description: 'Einlage, Zinsertrag, Kreditrahmen',
            content: <BankFacts caps={caps} isCeo={isCeo} asin={asin} />,
          },
        ]
      : []),
    {
      value: 'erfolge',
      label: 'Erfolge',
      description: 'Erfolge des Unternehmens',
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
            description: 'Kapitalmaßnahmen, Anleihen, Indizes, Gehalt, Logo …',
            content: <ManagePanel company={c} />,
          },
        ]
      : []),
  ];

  const header = (
    <DS.ProfileHeader
      as={isPhone ? 'h2' : 'h1'}
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
      // The tag row always exists (market maker policy is always shown, a placeholder while loading),
      // so the key figures below do not jump when the profile arrives.
      tags={
        c
          ? [
              ...(caps?.bank ? [{ label: 'Banklizenz' }] : []),
              { label: c.marketMakerPolicy === 'OPEN' ? 'Market Maker offen' : 'Market Maker geschlossen' },
              ...(c.sponsoredListings?.length ? [{ label: 'Designated Sponsor' }] : []),
              ...(isCeo ? [{ label: 'Du bist CEO' }] : []),
            ]
          : [{ label: <DS.Skeleton width="9em" /> }]
      }
      actions={
        <DS.Button size="sm" onClick={() => navigate(`/wertpapier/${asin}`)}>
          Zum Wertpapier
        </DS.Button>
      }
      stats={[
        { label: 'Kurs', value: c?.lastPrice ? c.lastPrice.value : '–', sub: c?.marketCap ? `Marktkap. ${DS.format.money(c.marketCap, '€', 2, true)}` : '\u00a0' },
        { label: 'Buchwert', value: caps?.bookValue ?? '–', compact: true, sub: perShare(caps?.bookValuePerShare) },
        { label: 'Net Cash', value: caps?.netCash ?? '–', compact: true, sub: perShare(caps?.netCashPerShare) },
        { label: 'Bargeld', value: c?.bankAccount?.cash ?? '–', compact: true, sub: cashFlow(history.data?.at(-1)?.cashFlow) },
      ]}
    />
  );
  const setTab = (v: string) => setParams({ ansicht: v }, { replace: true });

  return (
    <div className="page company" onClick={onLinkClick}>
      {isPhone ? (
        <PhoneProfile
          kind="company"
          name={c?.name ?? '…'}
          logoUrl={c?.logoUrl}
          back={{ href: '/unternehmen', label: 'Zurück' }}
          meta={
            <>
              <a className="pprof__asin" href={`/wertpapier/${asin}`}>
                {asin}
              </a>
              {c ? (c.ceo?.username ? <> · CEO <a href={`/spieler/${encodeURIComponent(c.ceo.username)}`}>{c.ceo.username}</a></> : ' · Kein CEO') : null}
            </>
          }
          stats={[
            { label: 'Kurs', value: c?.lastPrice ? c.lastPrice.value : '–' },
            { label: 'Buchwert', value: caps?.bookValue ?? '–' },
            { label: 'Net Cash', value: caps?.netCash ?? '–' },
          ]}
          details={header}
          detailsTitle="Unternehmen"
        />
      ) : (
        header
      )}
      <DS.Card flush className="panel">
        <ScrollTabs className="panel__tabs" size="sm" label="Unternehmen" items={items} value={tab} onChange={setTab} menu={isPhone} />
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

/** „22,27 € je Aktie“ under a header figure – a placeholder keeps the row height while loading. */
function perShare(n: number | undefined) {
  return n == null ? '\u00a0' : `${DS.format.money(n, '€', 2, 'auto')} je Aktie`;
}

/** „Cashflow ▲ +1,2 Mrd. €“ from the last daily snapshot. */
function cashFlow(n: number | undefined) {
  if (n == null) return '\u00a0';
  return (
    <>
      Cashflow <DS.SignedAmount value={n} compact="auto" />
    </>
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
            Einlage erhöhen und Zins-Boost unter <a href={`/unternehmen/${asin}?ansicht=fuehren&aktion=bank`}>Führen → Bank</a>. {' '}
          </>
        ) : null}
        Alle Banken, Leitzins und Zinstender: <a href="/zentralbank">Zentralbank</a>.
      </p>
    </div>
  );
}
