import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { DS } from '../ds';
import {
  useAverageBondRate,
  useBanking,
  useBankingActions,
  useCorporateAction,
  useIndexes,
  useIssue,
  useMainInterestRate,
  useMostTraded,
  type CompanyProfile,
  type IssueRequest,
} from '../api/queries';

const ACTIONS = [
  { value: 'kapital', label: 'Kapitalmaßnahme beantragen' },
  { value: 'anleihe', label: 'Anleihe ausgeben' },
  { value: 'index', label: 'Index auflegen' },
  { value: 'etf', label: 'ETF auflegen' },
  { value: 'optionsschein', label: 'Optionsschein ausgeben' },
  { value: 'bank', label: 'Bank (Lizenz, Reserven)' },
] as const;
type Action = (typeof ACTIONS)[number]['value'];

/**
 * „Führen“ for the CEO: one form at a time, chosen per select (?aktion=…). Corporate actions start a
 * poll of the shareholders; issues (bond, index, ETF, warrant) and banking act directly.
 */
export function ManagePanel({ company: c }: { company: CompanyProfile }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const raw = params.get('aktion');
  const aktion: Action = ACTIONS.some((a) => a.value === raw) ? (raw as Action) : 'kapital';
  const [done, setDone] = useState<string | null>(null);

  const action = useCorporateAction();
  const issue = useIssue(c.id);
  const mainRate = useMainInterestRate();
  const avgRate = useAverageBondRate();
  const indexes = useIndexes(aktion === 'etf' || aktion === 'optionsschein');
  const stocks = useMostTraded('STOCK', 100);
  const caps = c.companyCapabilities;
  const banking = useBanking(c.id, aktion === 'bank');
  const bank = useBankingActions(c.id);

  const stockOptions = useMemo(
    () =>
      (stocks.data?.content ?? [])
        .map((r) => ({ name: r.listing.name, securityIdentifier: r.listing.securityIdentifier }))
        .filter((s) => s.securityIdentifier !== c.securityIdentifier)
        .sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [stocks.data, c.securityIdentifier],
  );
  const indexOptions = useMemo(
    () => (indexes.data?.content ?? []).map((i) => ({ name: i.listing.name ?? i.name, securityIdentifier: i.listing.securityIdentifier })),
    [indexes.data],
  );

  const setAktion = (v: string) => {
    const next = new URLSearchParams(params);
    next.set('aktion', v);
    issue.reset();
    action.reset();
    setParams(next, { replace: true });
  };

  const submitIssue = (r: IssueRequest, label: string) =>
    issue.mutate(r, {
      onSuccess: (asin) => {
        setDone(`${label} ausgegeben.`);
        if (asin) navigate(`/wertpapier/${asin}`);
      },
    });

  const error = (m: { isError: boolean; error: Error | null }, what: string) =>
    m.isError && <DS.Banner variant="error">{what}: {m.error?.message}</DS.Banner>;

  let form: React.ReactNode;
  switch (aktion) {
    case 'kapital':
      form = (
        <>
          <DS.CorporateActionForm
            heading={false}
            company={{ id: c.id, name: c.name, securityIdentifier: c.securityIdentifier }}
            lastPrice={c.lastPrice?.value}
            outstandingShares={c.outstandingShares}
            cash={c.bankAccount?.cash}
            loading={action.isPending}
            onSubmit={({ endpoint, params: p, action: kind }) =>
              action.mutate(
                { endpoint, params: p },
                {
                  onSuccess: () => setDone(`Abstimmung „${DS.CORPORATE_ACTIONS.find((a) => a.value === kind)?.label}“ gestartet.`),
                },
              )
            }
          />
          {error(action, 'Nicht gestartet')}
        </>
      );
      break;
    case 'anleihe':
      form = (
        <>
          <DS.BondIssueForm
            canIssueSystemBonds={!!caps?.bank}
            mainRate={mainRate.data?.value}
            averageRate={avgRate.data ? avgRate.data.value * 100 : undefined}
            loading={issue.isPending}
            onSubmit={(v) => submitIssue(v, v.kind === 'system' ? 'Systemanleihen' : 'Anleihen')}
          />
          {error(issue, 'Nicht ausgegeben')}
        </>
      );
      break;
    case 'index':
      form = (
        <>
          <DS.IndexBuilder
            candidates={stockOptions}
            minMembers={5}
            loading={issue.isPending}
            onSubmit={(v) => submitIssue({ kind: 'index', ...v }, 'Index')}
          />
          {error(issue, 'Nicht aufgelegt')}
        </>
      );
      break;
    case 'etf':
      form = indexes.isLoading ? (
        <DS.Loading rows={4} />
      ) : (
        <>
          <DS.EtfCreateForm indexes={indexOptions} loading={issue.isPending} onSubmit={(v) => submitIssue({ kind: 'etf', ...v }, 'ETF')} />
          {error(issue, 'Nicht aufgelegt')}
        </>
      );
      break;
    case 'optionsschein':
      form = (
        <>
          <DS.WarrantIssueForm
            underlyings={[...indexOptions, ...stockOptions]}
            cash={c.bankAccount?.cash}
            loading={issue.isPending}
            onSubmit={(v) => submitIssue({ kind: 'warrant', ...v }, 'Optionsschein')}
          />
          {error(issue, 'Nicht ausgegeben')}
        </>
      );
      break;
    case 'bank': {
      const r = banking.reserves.data;
      form = banking.license.isLoading ? (
        <DS.Loading rows={4} />
      ) : (
        <>
          <DS.BankingPanel
            caps={{ bank: caps?.bank, bankReady: caps?.bankReady }}
            license={banking.license.data}
            reserves={r}
            reserveInterestRate={mainRate.data?.reserveInterestRate}
            cash={c.bankAccount?.cash}
            lastPayment={banking.lastPayment.data}
            nextPayment={banking.lastPayment.data?.nextPaymentDate}
            tender={banking.tender.data ?? undefined}
            tenderHref={(t) => `/wertpapier/${t.bondListing.securityIdentifier}`}
            onRequestLicense={() => bank.license.mutate(undefined, { onSuccess: () => setDone('Banklizenz beantragt.') })}
            onIncreaseReserves={(amount) => bank.reserves.mutate(amount, { onSuccess: () => setDone('Reserven erhöht.') })}
            onBoost={(multiplier) =>
              r?.id && bank.boost.mutate({ reservesId: r.id, multiplier }, { onSuccess: () => setDone('Zinsbonus erhöht.') })
            }
            primaryAction="reserves"
          />
          {error(bank.license, 'Lizenz nicht beantragt')}
          {error(bank.reserves, 'Reserven nicht erhöht')}
          {error(bank.boost, 'Bonus nicht erhöht')}
        </>
      );
      break;
    }
  }

  return (
    <div className="company__pad company__form company__manage">
      <DS.Select label="Was möchtest du tun?" size="sm" options={[...ACTIONS]} value={aktion} onChange={(e) => setAktion(e.target.value)} />
      {form}
      {done && (
        <DS.ToastRegion>
          <DS.Toast title={c.name} duration={5000} onClose={() => setDone(null)}>
            {done}
          </DS.Toast>
        </DS.ToastRegion>
      )}
    </div>
  );
}
