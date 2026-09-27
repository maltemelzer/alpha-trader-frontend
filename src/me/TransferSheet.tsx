import { useMemo, useState } from 'react';
import { DS } from '../ds';
import { useBankTransfer, useMe, useMyBankAccounts, useMyCompanies, useOtcCounterparties } from '../api/queries';
import { useDebounced } from '../lib/useDebounced';
import { counterpartyLabel } from '../orders/derive';
import { checkTransfer, maxAmount, type TransferAccount } from './bank';
import { bankAccounts } from './derive';

type Picked = { id: string; username: string; meta?: React.ReactNode };

const money = (n: number) => DS.format.money(n, '€', 2);
const input = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Recipient search over all private and company accounts. The search runs over securities accounts
 * (GET /api/v2/securitiesaccountdetails); their `clearingAccountId` is the bank account.
 */
function RecipientPicker({ value, onChange, exclude }: { value: Picked[]; onChange: (v: Picked[]) => void; exclude: string[] }) {
  const [q, setQ] = useState('');
  const search = useOtcCounterparties(useDebounced(q, 250));
  const results = (search.data ?? [])
    .filter((a) => a.clearingAccountId && !exclude.includes(a.clearingAccountId))
    .slice(0, 20)
    .map((a) => {
      const l = counterpartyLabel(a);
      return { id: a.clearingAccountId!, username: l.title, meta: a.privateAccount ? 'Privatkonto' : l.meta };
    });
  return (
    <DS.UserPicker
      label="An"
      value={value}
      onChange={(v) => onChange(v.slice(-1))}
      onSearch={setQ}
      results={results}
      loading={search.isFetching}
      max={8}
      placeholder="Spieler oder Unternehmen suchen"
      hint="Privatkonto eines Spielers oder Konto eines Unternehmens."
      emptyText="Kein Konto gefunden."
    />
  );
}

/**
 * Transfer from the private account to an own company account or to any player or company
 * (PUT /api/v2/banktransfer/{sender}?receiverBankAccountId&cashAmount). The server only accepts the
 * private account as sender – company accounts can receive, never send. Two steps: form, then a
 * confirmation with the balance afterwards – the money can't be called back.
 */
export function TransferSheet({
  open,
  onClose,
  accounts,
  defaultTo,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  accounts: TransferAccount[];
  /** Preselects an own company account as recipient (e.g. the one shown on /bank). */
  defaultTo?: string;
  onDone: (text: string) => void;
}) {
  const transfer = useBankTransfer();
  const from = accounts.find((a) => a.private);
  const others = accounts.filter((a) => !a.private);
  const preset = others.some((a) => a.id === defaultTo) ? defaultTo : undefined;
  const [mode, setMode] = useState<'eigen' | 'fremd'>(preset ? 'eigen' : 'fremd');
  const own = others.length > 0 && mode === 'eigen';
  const [ownTo, setOwnTo] = useState<string | undefined>(preset);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [raw, setRaw] = useState('');
  const [step, setStep] = useState<'form' | 'confirm'>('form');

  const ownTarget = others.find((a) => a.id === ownTo) ?? others[0];
  const to = own ? (ownTarget ? { id: ownTarget.id, name: ownTarget.name } : undefined) : picked[0] ? { id: picked[0].id, name: picked[0].username } : undefined;
  const check = checkTransfer(from, to?.id, raw);
  const busy = transfer.isPending;

  const close = () => {
    if (busy) return;
    setStep('form');
    transfer.reset();
    onClose();
  };

  const send = () => {
    if (!check.ok || !from || !to || check.amount == null) return;
    const amount = check.amount;
    transfer.mutate(
      { senderBankAccountId: from.id, receiverBankAccountId: to.id, cashAmount: amount },
      {
        onSuccess: () => {
          onDone(`${money(amount)} von ${from.name} an ${to.name} überwiesen.`);
          setRaw('');
          setPicked([]);
          setStep('form');
          onClose();
        },
      },
    );
  };

  const footer =
    step === 'form' ? (
      <div className="xfer__actions">
        <DS.Button onClick={close}>Abbrechen</DS.Button>
        <DS.Button variant="primary" disabled={!check.ok} onClick={() => setStep('confirm')}>
          Weiter
        </DS.Button>
      </div>
    ) : (
      <div className="xfer__actions">
        <DS.Button disabled={busy} onClick={() => setStep('form')}>
          Zurück
        </DS.Button>
        <DS.Button variant="primary" loading={busy} onClick={send}>
          Jetzt überweisen
        </DS.Button>
      </div>
    );

  return (
    <DS.Sheet open={open} onClose={close} title={step === 'form' ? 'Überweisung' : 'Überweisung prüfen'} width={460} footer={footer}>
      {open && step === 'form' && (
        <form
          className="xfer"
          onSubmit={(e) => {
            e.preventDefault();
            if (check.ok) setStep('confirm');
          }}
        >
          <DS.SummaryList
            items={[{ label: 'Von', value: from ? `${from.name} · ${DS.format.money(from.cash, '€', 2, true)}` : '–' }]}
          />
          {others.length > 0 && (
            <p className="xfer__note">Überweisen geht nur vom Privatkonto – Unternehmenskonten können empfangen, aber nicht senden.</p>
          )}
          {others.length > 0 && (
            <DS.SegmentedControl
              aria-label="Empfänger"
              size="sm"
              options={[
                { value: 'fremd', label: 'Spieler / Unternehmen' },
                { value: 'eigen', label: 'Eigenes Unternehmen' },
              ]}
              value={mode}
              onChange={(v) => setMode(v as 'eigen' | 'fremd')}
            />
          )}
          {own ? (
            <DS.Select
              label="An"
              value={ownTarget?.id}
              onChange={(e) => setOwnTo(e.target.value)}
              options={others.map((a) => ({ value: a.id, label: `${a.name} · ${DS.format.money(a.cash, '€', 2, true)}` }))}
            />
          ) : (
            <RecipientPicker value={picked} onChange={setPicked} exclude={from ? [from.id] : []} />
          )}
          <DS.Input
            label="Betrag"
            numeric
            suffix="€"
            inputMode="decimal"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            error={check.error}
            hint={from ? `Verfügbar ${money(from.cash)} · auch „2,5 Mio.“` : undefined}
          />
          {from && (
            <div className="xfer__quick" role="group" aria-label="Schnellauswahl Betrag">
              {[0.1, 0.25, 0.5].map((q) => (
                <DS.Button key={q} size="sm" variant="ghost" onClick={() => setRaw(input(maxAmount(from.cash * q)))}>
                  {q * 100} %
                </DS.Button>
              ))}
              <DS.Button size="sm" variant="ghost" onClick={() => setRaw(input(maxAmount(from.cash)))}>
                Max.
              </DS.Button>
            </div>
          )}
          <p className="xfer__note">
            Einen Verwendungszweck kennt die Schnittstelle nicht – beim Empfänger steht „Überweisung erhalten“.
          </p>
        </form>
      )}
      {open && step === 'confirm' && from && to && check.amount != null && (
        <div className="xfer">
          <DS.SummaryList
            items={[
              { label: 'Von', value: from.name },
              { label: 'An', value: to.name },
              { label: 'Betrag', value: check.amount, compact: false },
              { label: `${from.name} danach`, value: from.cash - check.amount, compact: false, total: true },
            ]}
          />
          <DS.Banner title="Endgültig">Eine Überweisung lässt sich nicht zurückholen. Prüfe den Empfänger.</DS.Banner>
          {transfer.isError && <DS.Banner variant="error">Überweisung fehlgeschlagen: {transfer.error.message}</DS.Banner>}
        </div>
      )}
    </DS.Sheet>
  );
}

/** All bank accounts the player can send from: private account first, then companies run as CEO. */
export function useTransferAccounts() {
  const me = useMe();
  const companies = useMyCompanies(me.data?.id);
  const own = useMyBankAccounts();
  return useMemo(() => bankAccounts(own.data ?? [], companies.data ?? []), [own.data, companies.data]);
}

/** The transfer sheet with its own accounts and success toast – for pages other than /bank. */
export function QuickTransfer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const accounts = useTransferAccounts();
  const [done, setDone] = useState<string | null>(null);
  return (
    <>
      <TransferSheet open={open} onClose={onClose} accounts={accounts} onDone={setDone} />
      {done && (
        <DS.ToastRegion>
          <DS.Toast title="Überweisung" duration={5000} onClose={() => setDone(null)}>
            {done}
          </DS.Toast>
        </DS.ToastRegion>
      )}
    </>
  );
}
