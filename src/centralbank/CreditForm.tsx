import { useState } from 'react';
import { DS } from '../ds';
import { useIssue, useMainInterestRate, useMyBanks, type MyBank } from '../api/queries';
import { Confirm } from '../companies/Confirm';
import { parseAmount } from '../companies/derive';
import { short } from '../lib/format';
import { systemBondCredit } from './tender';

const NBSP = String.fromCharCode(0xa0);
const pct = (n: number | undefined) =>
  n == null ? '–' : `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${NBSP}%`;

/**
 * Take central bank credit: a bank issues system bonds, which the central bank buys at the system bond
 * rate (POST /api/systembonds?companyId&numberOfBonds). Only for the CEO of a bank; the bar shows how much
 * of the credit line (10 % of the reserves) is used, with this credit included.
 */
export function CreditForm() {
  const { banks, isLoading } = useMyBanks();
  const [bankId, setBankId] = useState<string>();
  const bank = banks.find((b) => b.id === bankId) ?? banks[0];
  if (isLoading) return <DS.Skeleton variant="text" />;
  if (!bank)
    return (
      <span className="cb__note tdr__lock">
        <DS.Icon name="bank" size={16} /> Kredit nehmen können nur Banken – du führst keine.
      </span>
    );
  return <BankCredit key={bank.id} bank={bank} banks={banks} onBank={setBankId} />;
}

function BankCredit({ bank, banks, onBank }: { bank: MyBank; banks: MyBank[]; onBank: (id: string) => void }) {
  const main = useMainInterestRate();
  const issue = useIssue(bank.id);
  const [raw, setRaw] = useState('');
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const rate = main.data ? main.data.value + 1 : undefined;
  const parsed = parseAmount(raw);
  const n = parsed != null ? Math.floor(parsed) : 0;
  const c = systemBondCredit(n, rate, bank.maxCentralBankLoans, bank.takenCentralBankLoans ?? 0);
  const error = raw && parsed == null ? 'Stückzahl wie „1 Mio.“' : c.room != null && n > c.room ? `höchstens ${c.room.toLocaleString('de-DE')} Stück` : undefined;
  const taken = bank.takenCentralBankLoans ?? 0;
  const max = bank.maxCentralBankLoans ?? 0;
  return (
    <div className="cb__stack tdr-credit">
      <h3 className="cb__h">Kredit aufnehmen</h3>
      {banks.length > 1 && (
        <DS.Select
          size="sm"
          aria-label="Bank"
          value={bank.id}
          options={banks.map((b) => ({ value: b.id, label: b.name }))}
          onChange={(e) => onBank(e.target.value)}
        />
      )}
      <DS.ProgressBar
        size="sm"
        variant="neutral"
        label={`Kreditrahmen ${bank.name}`}
        value={Math.min(100, c.usedAfter ?? 0)}
        valueText={`${short(taken + (error ? 0 : c.volume))}${NBSP}€ von ${short(max)}${NBSP}€`}
      />
      <div className="tdr-credit__row">
        <DS.Input
          label="Systemanleihen"
          size="sm"
          numeric
          suffix="Stk."
          placeholder="z. B. 1 Mio."
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          error={error}
          hint={n > 0 && !error ? `${short(c.volume)}${NBSP}€ zu ${pct(rate)}, zurück ${short(c.payback ?? 0)}${NBSP}€` : `je 100${NBSP}€, Zins ${pct(rate)} für die Laufzeit`}
        />
        <DS.Button variant="secondary" disabled={!n || !!error} onClick={() => setOpen(true)}>
          Kredit aufnehmen …
        </DS.Button>
      </div>
      {done && <DS.Banner>{done}</DS.Banner>}
      <Confirm
        open={open}
        alert
        title="Kredit aufnehmen?"
        description={`${bank.name} gibt ${n.toLocaleString('de-DE')} Systemanleihen aus; die Zentralbank kauft sie.`}
        confirmLabel="Verbindlich aufnehmen"
        pending={issue.isPending}
        error={issue.error?.message}
        onClose={() => {
          setOpen(false);
          issue.reset();
        }}
        onConfirm={() =>
          issue.mutate(
            { kind: 'system', numberOfBonds: n },
            {
              onSuccess: () => {
                setOpen(false);
                setRaw('');
                setDone(`${short(c.volume)}${NBSP}€ Kredit aufgenommen.`);
              },
            },
          )
        }
      >
        <DS.SummaryList
          items={[
            { label: 'Du bekommst', value: c.volume },
            { label: 'Zins für die Laufzeit', value: pct(rate) },
            { label: 'Zurückzahlen (≈ 6½ Tage)', value: c.payback ?? '–', total: true },
          ]}
        />
      </Confirm>
    </div>
  );
}
