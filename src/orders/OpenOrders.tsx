import { useState } from 'react';
import { useNavigate } from 'react-router';
import { DS } from '../ds';
import { useDeleteOrder, useOpenOrders } from '../api/queries';
import type { SecurityOrderView } from '../../vendor/bankiersgruen';

/** Open orders of an account with „Löschen“ behind a confirmation. */
export function OpenOrders({ securitiesAccountId, density }: { securitiesAccountId?: string; density?: 'sm' | 'md' }) {
  const navigate = useNavigate();
  const orders = useOpenOrders(securitiesAccountId);
  const del = useDeleteOrder();
  const [confirm, setConfirm] = useState<SecurityOrderView | null>(null);

  if (orders.isLoading || !securitiesAccountId) return <DS.Loading rows={5} label="Orders werden geladen" />;
  if (orders.isError) return <DS.Banner variant="error">Orders konnten nicht geladen werden.</DS.Banner>;
  const asin = (o: SecurityOrderView) => o.listing?.securityIdentifier ?? o.securityIdentifier;
  return (
    <>
      <DS.OrderList
        orders={orders.data?.content ?? []}
        density={density}
        hrefFor={(o) => `/wertpapier/${asin(o)}`}
        onOpen={(o) => navigate(`/wertpapier/${asin(o)}`)}
        onDelete={(o) => setConfirm(o)}
        empty={<DS.EmptyState compact as="h3" title="Keine offenen Orders" />}
      />
      <DS.Dialog
        open={!!confirm}
        role="alertdialog"
        size="sm"
        onClose={() => !del.isPending && setConfirm(null)}
        dismissible={!del.isPending}
        title="Order löschen?"
        description={
          confirm &&
          `${confirm.action === 'BUY' ? 'Kauf' : 'Verkauf'} von ${confirm.numberOfShares.toLocaleString('de-DE')} Stück ${
            confirm.listing?.name ?? confirm.securityIdentifier
          }. Gebundenes Geld bzw. gebundene Stücke werden wieder frei.`
        }
        actions={
          <>
            <DS.Button variant="secondary" onClick={() => setConfirm(null)} disabled={del.isPending}>
              Behalten
            </DS.Button>
            <DS.Button
              variant="danger"
              loading={del.isPending}
              onClick={() => confirm && del.mutate(confirm.id, { onSuccess: () => setConfirm(null) })}
            >
              Löschen
            </DS.Button>
          </>
        }
      >
        {del.isError && <DS.Banner variant="error">Löschen fehlgeschlagen: {del.error.message}</DS.Banner>}
      </DS.Dialog>
    </>
  );
}
