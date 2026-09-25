import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { DS } from '../ds';
import { useBankTransfer, useCashLogs, useMe, useMyBankAccounts, useMyCompanies } from '../api/queries';
import { useMediaQuery } from '../lib/useMediaQuery';
import { bankAccounts } from './derive';
import './MePage.css';

/** Bank: balances of all own accounts, transfers between them, account statement. */
export function BankPage() {
  const isWide = useMediaQuery('(min-width: 1100px)');
  const [params, setParams] = useSearchParams();
  const me = useMe();
  const companies = useMyCompanies(me.data?.id);
  const own = useMyBankAccounts();
  const accounts = useMemo(() => bankAccounts(own.data ?? [], companies.data ?? []), [own.data, companies.data]);
  const selected = accounts.find((a) => a.id === params.get('konto')) ?? accounts[0];
  const logs = useCashLogs(selected?.id);
  const transfer = useBankTransfer();
  const [done, setDone] = useState<string | null>(null);

  const statement = (
    <DS.Card
      flush
      className="panel"
      title="Kontoauszug"
      action={
        accounts.length > 1 ? (
          <DS.Select
            aria-label="Konto"
            size="sm"
            fullWidth={false}
            value={selected?.id}
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            onChange={(e) => setParams({ konto: e.target.value }, { replace: true })}
          />
        ) : undefined
      }
    >
      <div className="panel__fill scroll me__flush">
        {logs.isLoading || !selected ? (
          <DS.Loading rows={6} />
        ) : (
          <DS.AccountStatement
            entries={logs.data?.content ?? []}
            bankAccountId={selected.id}
            density="sm"
            empty={<DS.EmptyState compact as="h3" title="Keine Buchungen" />}
          />
        )}
      </div>
    </DS.Card>
  );

  return (
    <div className="page">
      <DS.PageHeader size="md" title="Bank" meta={<span>{accounts.length === 1 ? "1 Konto" : `${accounts.length} Konten`}</span>} />
      <div className={`page__body me__bank${isWide ? ' me__bank--wide' : ''}`}>
        <div className="page__col me__bank-side">
          <DS.StatGroup columns="1fr" aria-label="Kontostände">
            {accounts.length ? (
              accounts.map((a) => <DS.StatTile key={a.id} label={a.name} value={a.cash} compact="auto" />)
            ) : (
              <DS.StatTile label="Privatkonto" value={<DS.Skeleton width="9em" />} />
            )}
          </DS.StatGroup>
          <DS.Card title="Überweisung">
            {accounts.length > 1 ? (
              <DS.TransferForm
                accounts={accounts}
                loading={transfer.isPending}
                submitVariant="primary"
                onSubmit={(t) =>
                  transfer.mutate(t, { onSuccess: () => setDone(`${DS.format.money(t.cashAmount)} überwiesen.`) })
                }
              />
            ) : (
              <p className="me__note">Überweisungen gehen zwischen deinem Privatkonto und den Konten deiner Unternehmen. Du führst noch kein Unternehmen.</p>
            )}
            {transfer.isError && <DS.Banner variant="error">Überweisung fehlgeschlagen: {transfer.error.message}</DS.Banner>}
          </DS.Card>
        </div>
        {statement}
      </div>
      {done && (
        <DS.ToastRegion>
          <DS.Toast title="Bank" duration={4000} onClose={() => setDone(null)}>
            {done}
          </DS.Toast>
        </DS.ToastRegion>
      )}
    </div>
  );
}
