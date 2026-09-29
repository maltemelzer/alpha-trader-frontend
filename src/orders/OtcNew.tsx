import { useState } from 'react';
import { DS } from '../ds';
import {
  checkOrder,
  useAccountPortfolio,
  useAddOrder,
  useListings,
  useOtcCounterparties,
  usePriceSpread,
  useSecuritySearch,
} from '../api/queries';
import { toSpread } from '../api/types';
import { useDebounced } from '../lib/useDebounced';
import { searchTerm } from '../lib/securitySearch';
import { counterpartyLabel, otcOfferParams, rankCounterparties } from './derive';
import type { MyAccount } from './Otc';

type OrderParams = Parameters<NonNullable<React.ComponentProps<typeof DS.OrderTicket>['onSubmit']>>[0];
type Picked = { id: string; username: string; meta?: React.ReactNode };

const typeLabel = (t: string) => (DS.LISTING_TYPES as Record<string, string>)[t] ?? t;

/** Counterparty search over private and company securities accounts (the API wants the account id). */
function CounterpartyPicker({
  value,
  onChange,
  exclude,
}: {
  value: Picked[];
  onChange: (v: Picked[]) => void;
  exclude: string[];
}) {
  const [q, setQ] = useState('');
  const debounced = useDebounced(q, 250);
  const search = useOtcCounterparties(debounced);
  const results = rankCounterparties(search.data ?? [], debounced)
    .filter((a) => a.id && !exclude.includes(a.id))
    .slice(0, 20)
    .map((a) => {
      const l = counterpartyLabel(a);
      return { id: a.id!, username: l.title, meta: l.meta };
    });
  return (
    <DS.UserPicker
      label="Gegenpartei"
      value={value}
      onChange={(v) => onChange(v.slice(-1))}
      onSearch={setQ}
      results={results}
      loading={search.isFetching}
      // max limits the shown hits, not the picks: one counterparty is kept by onChange (slice(-1)).
      max={10}
      placeholder="Spieler oder Unternehmen suchen"
      hint="Privatdepot eines Spielers oder Portfolio eines Unternehmens."
      emptyText="Kein Portfolio gefunden."
    />
  );
}

/** Security search for the ticket when no ASIN is given yet. */
function ListingPicker({ onPick }: { onPick: (asin: string) => void }) {
  const [q, setQ] = useState('');
  const search = useSecuritySearch(useDebounced(q, 250), 8);
  const results = (search.data ?? []).map((r) => ({
    id: r.asin,
    name: r.name,
    ticker: r.asin,
    meta: typeLabel(r.type),
    price: r.price,
  }));
  return (
    <DS.StockSearch
      label="Wertpapier"
      placeholder="Name oder ASIN"
      value={q}
      onChange={setQ}
      results={searchTerm(q).length >= 2 ? results : []}
      loading={search.isFetching}
      emptyText={searchTerm(q).length < 2 ? 'Mindestens zwei Zeichen eingeben.' : 'Nichts gefunden.'}
      onSelect={(r) => r.id && onPick(r.id)}
    />
  );
}

/**
 * New OTC order in a Sheet: pick the counterparty's securities account, then the design-system
 * order ticket. The ticket's review step is the confirmation; the chosen counterparty replaces the
 * ticket's own free-text „Gegenpartei (OTC)“ field (otcOfferParams).
 */
export function OtcNewSheet({
  open,
  onClose,
  accounts,
  asin: initialAsin,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  accounts: MyAccount[];
  asin?: string;
  onDone: (ok: boolean, text: string) => void;
}) {
  const [asin, setAsin] = useState(initialAsin ?? '');
  const [cp, setCp] = useState<Picked[]>([]);
  const [accountId, setAccountId] = useState<string | undefined>();
  const account = accounts.find((a) => a.id === accountId) ?? accounts[0];
  const listing = useListings(asin ? [asin] : [])[asin];
  const spread = usePriceSpread(asin);
  const portfolio = useAccountPortfolio(account?.id);
  const pos = portfolio.data?.positions.find((p) => p.securityIdentifier === asin);
  const add = useAddOrder();
  const counterparty = cp[0];

  const submit = (params: OrderParams) => {
    if (!counterparty) return;
    add.mutate(otcOfferParams(params, counterparty.id), {
      onSuccess: () =>
        onDone(
          true,
          `OTC-${params.action === 'BUY' ? 'Kauf' : 'Verkauf'}order über ${params.numberOfShares.toLocaleString('de-DE')} Anteile an ${counterparty.username} aufgegeben.`,
        ),
      onError: (e) => onDone(false, e.message),
    });
  };

  return (
    <DS.Sheet open={open} onClose={() => !add.isPending && onClose()} title="Neue OTC-Order" width={460}>
      {open && (
        <div className="otc-new">
          <CounterpartyPicker value={cp} onChange={setCp} exclude={accounts.map((a) => a.id)} />
          {counterparty ? (
            <DS.Banner title={`Außerbörslich an ${counterparty.username}`}>
              Nur dieses Portfolio kann deine Order ausführen. Bis dahin bleibt sie unter „OTC · Von dir“ offen.
            </DS.Banner>
          ) : (
            <p className="otc-new__hint">Wähle zuerst die Gegenpartei, dann Wertpapier und Menge.</p>
          )}
          {asin && (
            <div className="otc-new__asin">
              <span className="bnk-field__label">Wertpapier</span>
              <DS.Button variant="ghost" size="sm" onClick={() => setAsin('')}>
                Anderes Wertpapier
              </DS.Button>
            </div>
          )}
          {accounts.length > 0 && (
            <DS.OrderTicket
              key={asin}
              listing={
                listing
                  ? {
                      securityIdentifier: listing.securityIdentifier!,
                      name: listing.name ?? asin,
                      type: listing.type,
                    }
                  : { securityIdentifier: '', name: '' }
              }
              listingPicker={<ListingPicker onPick={setAsin} />}
              spread={asin ? toSpread(spread.data) : undefined}
              accounts={accounts}
              accountId={account?.id}
              onAccountChange={setAccountId}
              position={
                pos
                  ? {
                      numberOfShares: pos.numberOfShares - pos.committedShares,
                      averageBuyingPrice: pos.averageBuyingPrice,
                    }
                  : undefined
              }
              defaultType="LIMIT"
              defaultAction="SELL"
              disabled={!counterparty}
              onCheck={async (p) => {
                const check = await checkOrder(p);
                return { ...check, spread: toSpread(check.spread) };
              }}
              onSubmit={submit}
              loading={add.isPending}
            />
          )}
        </div>
      )}
    </DS.Sheet>
  );
}
