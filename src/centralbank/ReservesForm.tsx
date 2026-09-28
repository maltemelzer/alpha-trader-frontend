import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { DS } from '../ds';
import { useBanking, useBankingActions, useMainInterestRate, useMyBanks, type MyBank, type MyNonBank } from '../api/queries';
import { Confirm } from '../companies/Confirm';
import { parseAmount } from '../companies/derive';
import { Plot } from '../charts/Plot';
import { MiniStats } from '../app/phone';
import { short } from '../lib/format';
import { reservesMoveChart } from './charts';
import { BANK_LICENSE_MIN_CASH, QUICK_SHARES, daysToEarnBack, licenseProgress, reservesAmountError, reservesEffect, shareOfCash } from './reserves';

const NBSP = String.fromCharCode(0xa0);
const eur = (n: number | undefined) => (n == null ? '–' : `${short(n)}${NBSP}€`);
const pct = (n: number | undefined) =>
  n == null ? '–' : `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${NBSP}%`;
const plus = (n: number) => `+${short(n)}${NBSP}€`;

/**
 * „Einlage erhöhen“: a bank moves cash into its central bank reserves (PUT /api/centralbankreserves?companyId&cashAmount).
 * Shows what moves (cash → reserves), what it earns per day at the reserve rate + boost and how the credit line
 * (10 % of the reserves) grows – live while typing – and asks before sending, since the API knows no way back.
 * Only CEOs of banks; everyone else learns why not and what a license takes. The bank is `?bank=<ASIN>`.
 */
export function ReservesCard({ phone }: { phone?: boolean }) {
  const { banks, others, isLoading } = useMyBanks();
  const [params, setParams] = useSearchParams();
  const wanted = params.get('bank');
  const bank = banks.find((b) => b.securityIdentifier === wanted) ?? banks[0];
  const choose = (asin: string) => {
    const next = new URLSearchParams(params);
    next.set('bank', asin);
    setParams(next, { replace: true });
  };

  if (isLoading || !bank)
    return (
      <DS.Card flush className="panel" title={phone ? undefined : 'Einlage erhöhen'}>
        <div className="panel__fill scroll cb__pad">{isLoading ? <DS.Loading rows={5} /> : <NoBank others={others} />}</div>
      </DS.Card>
    );
  return <BankReserves key={bank.id} bank={bank} banks={banks} onBank={choose} phone={phone} />;
}

function BankReserves({ bank, banks, onBank, phone }: { bank: MyBank; banks: MyBank[]; onBank: (asin: string) => void; phone?: boolean }) {
  const main = useMainInterestRate();
  const banking = useBanking(bank.id, true);
  const actions = useBankingActions(bank.id);
  const [raw, setRaw] = useState('');
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const detail = banking.reserves.data;
  // the CEO's own reserves are exact and carry the boost; the company profile is the fallback
  const reserves = detail?.cashHolding ?? bank.reserves ?? (bank.maxCentralBankLoans ?? 0) * 10;
  const boost = detail?.interestRateBoost ?? 0;
  const parsed = parseAmount(raw);
  const error = reservesAmountError(raw, parsed, bank.cash);
  const amount = !error && parsed ? parsed : 0;
  const e = reservesEffect(amount, { cash: bank.cash, reserves }, main.data?.reserveInterestRate, boost);
  const payback = daysToEarnBack(e.ratePerDay);
  const noCash = !bank.cash || bank.cash <= 0;

  const setShare = (share: number) => {
    const n = shareOfCash(bank.cash, share);
    setRaw(n ? n.toLocaleString('de-DE', { maximumFractionDigits: 2 }) : '');
    setDone(null);
  };
  const activeShare = QUICK_SHARES.find((s) => amount > 0 && shareOfCash(bank.cash, s) === amount);

  const tiles = [
    { key: 'res', label: 'Einlage', value: eur(e.reservesAfter), hint: amount ? `jetzt ${eur(e.reservesBefore)}` : 'bei der Zentralbank' },
    {
      key: 'inc',
      label: 'Zinsertrag / Tag',
      value: eur(e.incomeAfter),
      hint: amount && e.incomeAfter != null ? `${plus(e.incomeAfter - (e.incomeBefore ?? 0))} je Tag` : `${pct(e.ratePerDay)} / Tag${boost ? ' inkl. Boost' : ''}`,
    },
    { key: 'credit', label: 'Kreditrahmen', value: eur(e.creditAfter), hint: amount ? plus(e.creditAfter - e.creditBefore) : '10 % der Einlage' },
  ];

  const button = (
    <DS.Button variant="primary" fullWidth={phone} disabled={!amount} onClick={() => setOpen(true)}>
      {amount ? `${eur(amount)} einlegen …` : 'Einlage erhöhen …'}
    </DS.Button>
  );

  return (
    <DS.Card flush className="panel" title={phone ? undefined : 'Einlage erhöhen'}>
      <div className="panel__fill scroll cb__pad">
        <div className="cb__stack rsv">
          {banks.length > 1 && (
            <DS.Select
              size="sm"
              aria-label="Bank"
              value={bank.securityIdentifier}
              options={banks.map((b) => ({ value: b.securityIdentifier, label: b.name }))}
              onChange={(ev) => onBank(ev.target.value)}
            />
          )}
          {phone ? (
            <MiniStats label="Wirkung der Einlage" items={tiles.map((t) => ({ key: t.key, label: t.label, value: t.value }))} />
          ) : (
            <DS.StatGroup columns="repeat(3, minmax(0, 1fr))" aria-label="Wirkung der Einlage">
              {tiles.map((t) => (
                <DS.StatTile key={t.key} label={t.label} value={t.value} hint={t.hint} />
              ))}
            </DS.StatGroup>
          )}
          <div className="rsv__move">
            <Plot aria-label={`${bank.name}: Bargeld und Einlage jetzt und nach dem Einlegen`} figure={(t, w) => reservesMoveChart(t, w, e)} />
          </div>
          <div className="rsv__amount">
            <DS.Input
              label="Betrag"
              numeric
              suffix="€"
              placeholder="z. B. 2,5 Mio."
              value={raw}
              disabled={noCash}
              onChange={(ev) => {
                setRaw(ev.target.value);
                setDone(null);
              }}
              error={error}
              hint={noCash ? `${bank.name} hat kein Bargeld.` : `Bargeld ${eur(bank.cash)} · bleibt ${eur(e.cashAfter)}`}
            />
            <div className="rsv__quick" role="group" aria-label="Anteil am Bargeld">
              {QUICK_SHARES.map((s) => (
                <DS.Button key={s} size="sm" variant="ghost" aria-pressed={activeShare === s} disabled={noCash} onClick={() => setShare(s)}>
                  {s === 1 ? 'Alles' : `${s * 100}${NBSP}%`}
                </DS.Button>
              ))}
            </div>
          </div>
          <p className="cb__note">
            Die Zentralbank zahlt jeden Tag {pct(e.ratePerDay)} auf die Einlage – aufs Bargeld der Bank, die Einlage selbst wächst
            nicht.
            {payback != null && ` Nach etwa ${Math.round(payback).toLocaleString('de-DE')} Tagen hat ein eingelegter Euro sich einmal verdient.`}{' '}
            <b>Zurückholen lässt sich eine Einlage nicht</b> – das Spiel kennt nur Erhöhen.
          </p>
          {done && <DS.Banner>{done}</DS.Banner>}
          {!phone && <div className="rsv__submit">{button}</div>}
        </div>
      </div>
      {phone && <div className="cb-bar">{button}</div>}
      <Confirm
        open={open}
        alert
        title="Einlage erhöhen?"
        description={`${bank.name} legt ${eur(amount)} bei der Zentralbank an. Zurückholen geht nicht.`}
        confirmLabel="Verbindlich einlegen"
        pending={actions.reserves.isPending}
        error={actions.reserves.error?.message}
        onClose={() => {
          setOpen(false);
          actions.reserves.reset();
        }}
        onConfirm={() =>
          actions.reserves.mutate(amount, {
            onSuccess: () => {
              setOpen(false);
              setRaw('');
              setDone(`${eur(amount)} eingelegt – die Einlage von ${bank.name} ist jetzt ${eur(e.reservesAfter)}.`);
            },
          })
        }
      >
        <DS.SummaryList
          items={[
            { label: 'Vom Bargeld', value: amount },
            { label: 'Einlage danach', value: e.reservesAfter },
            { label: 'Zinsertrag je Tag danach', value: e.incomeAfter ?? '–' },
            { label: 'Kreditrahmen danach', value: e.creditAfter, total: true },
          ]}
        />
      </Confirm>
    </DS.Card>
  );
}

/** Not a bank: say why there is no form, and how far each own company is from a license. */
function NoBank({ others }: { others: MyNonBank[] }) {
  if (!others.length)
    return (
      <DS.EmptyState compact as="h3" title="Einlagen halten nur Banken">
        Eine Zentralbankeinlage gehört einem Unternehmen mit Banklizenz. Du führst kein Unternehmen – gründe eins oder werde CEO,
        dann kannst du ab {eur(BANK_LICENSE_MIN_CASH)} Bargeld eine Lizenz beantragen.
      </DS.EmptyState>
    );
  return (
    <div className="cb__stack">
      <p className="cb__note">
        Einlagen halten nur Banken, und keins deiner Unternehmen hat eine Banklizenz. Beantragen kann sie ein Unternehmen ab{' '}
        {eur(BANK_LICENSE_MIN_CASH)} Bargeld – danach steht hier, was die Einlage bringt.
      </p>
      <ul className="cb__credit">
        {others.map((c) => {
          const ready = c.bankReady || (c.cash ?? 0) >= BANK_LICENSE_MIN_CASH;
          return (
            <li key={c.id}>
              <div className="cb__row">
                <a href={`/unternehmen/${c.securityIdentifier}?ansicht=fuehren&aktion=bank`}>{c.name}</a>
                <span>{ready ? 'Lizenz möglich' : `${eur(c.cash)} von ${eur(BANK_LICENSE_MIN_CASH)}`}</span>
              </div>
              <DS.ProgressBar
                size="sm"
                variant="neutral"
                value={ready ? 100 : licenseProgress(c.cash)}
                showValue={false}
                aria-label={`${c.name}: Bargeld für die Banklizenz`}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
