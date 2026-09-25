import { useState } from 'react';
import { DS } from '../ds';
import { useDailyHistories, useDeleteIndex, useMyFunds, useMyIndexes, usePriceSpreads, useWarrantsOn, type MyIndex } from '../api/queries';
import { Confirm } from '../companies/Confirm';
import { etfsTracking, indexTrend } from './derive';

const NBSP = String.fromCharCode(0xa0);

/**
 * „Meine Organisation → Indizes“: the indexes the player operates, each with value, 14-day
 * sparkline and members, linked to the securities page, and deleting one (with the consequences).
 * Rules cannot be edited here: GET …/rule answers 500, so the current rule is unknown.
 */
export function MyIndexes() {
  const indexes = useMyIndexes();
  const funds = useMyFunds();
  const list = indexes.data ?? [];
  const asins = list.flatMap((i) => (i.listing?.securityIdentifier ? [i.listing.securityIdentifier] : []));
  const spreads = usePriceSpreads(asins);
  const histories = useDailyHistories(asins);
  const [deleting, setDeleting] = useState<MyIndex | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (indexes.isLoading) return <DS.Loading rows={3} />;
  if (indexes.isError) return <DS.Banner variant="error">Indizes nicht geladen: {indexes.error.message}</DS.Banner>;
  if (!list.length)
    return (
      <DS.EmptyState compact as="h3" title="Kein eigener Index">
        Als CEO legst du einen Index unter „Führen → Index auflegen“ an. Er erscheint dann hier.
      </DS.EmptyState>
    );

  return (
    <>
      <ul className="bnk-list org-indexes">
        {list.map((i) => {
          const asin = i.listing?.securityIdentifier ?? '';
          const trend = indexTrend(histories[asin]);
          const value = spreads[asin]?.lastPrice?.value ?? trend.spark.at(-1);
          const etfs = etfsTracking(funds.data, asin);
          const members = i.membersCount ?? i.members?.length;
          return (
            <li key={i.id ?? asin} className="org-index">
              {/* name, sparkline and value form one link to the securities page */}
              <a className="org-index__link" href={`/wertpapier/${asin}`}>
                <span className="org-index__id">
                  <span className="org-index__name">{i.name ?? i.listing?.name ?? asin}</span>
                  <span className="org-index__meta">
                    {members != null && `${members.toLocaleString('de-DE')} Mitglieder · `}
                    {etfs.length > 0 && `${etfs.length} ETF von dir · `}
                    <span className="num">{asin}</span>
                  </span>
                </span>
                <span className="org-index__spark">
                  {trend.spark.length > 1 && <DS.Sparkline data={trend.spark} width={64} height={24} label={`${i.name ?? asin}, 14 Tage`} />}
                </span>
                <span className="org-index__value">
                  <span className="num">{value != null ? <DS.Amount value={value} compact /> : '–'}</span>
                  {trend.change != null ? <DS.PriceChange value={trend.change} size="sm" suffix="14 T" /> : <span className="org-index__meta">{NBSP}</span>}
                </span>
              </a>
              <DS.Button size="sm" variant="ghost" aria-label={`${i.name ?? asin} löschen`} onClick={() => setDeleting(i)}>
                Löschen
              </DS.Button>
            </li>
          );
        })}
      </ul>
      {deleting && (
        <DeleteIndexDialog
          index={deleting}
          etfs={etfsTracking(funds.data, deleting.listing?.securityIdentifier ?? '')}
          onClose={() => setDeleting(null)}
          onDone={(msg) => {
            setDeleting(null);
            setDone(msg);
          }}
        />
      )}
      {done && (
        <DS.ToastRegion>
          <DS.Toast title="Index" duration={5000} onClose={() => setDone(null)}>
            {done}
          </DS.Toast>
        </DS.ToastRegion>
      )}
    </>
  );
}

function DeleteIndexDialog({
  index: i,
  etfs,
  onClose,
  onDone,
}: {
  index: MyIndex;
  etfs: { name?: string; listing?: { securityIdentifier?: string } }[];
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const asin = i.listing?.securityIdentifier ?? '';
  const name = i.name ?? i.listing?.name ?? asin;
  const del = useDeleteIndex();
  const warrants = useWarrantsOn(asin);
  const running = warrants.data?.totalElements ?? warrants.data?.content.length ?? 0;
  return (
    <Confirm
      open
      danger
      title={`Index ${name} löschen?`}
      description="Der Index wird aufgelöst und nicht mehr berechnet. Das lässt sich nicht rückgängig machen."
      confirmLabel="Index löschen"
      pending={del.isPending}
      error={del.isError ? del.error.message : null}
      onConfirm={() => del.mutate(asin, { onSuccess: () => onDone(`${name} gelöscht.`) })}
      onClose={() => !del.isPending && onClose()}
    >
      <ul className="org-index__effects">
        <li>
          ETFs auf {asin} verlieren ihren Basisindex – ihr Betreiber muss einen neuen wählen.
          {etfs.length > 0 && (
            <>
              {' '}
              Von dir:{' '}
              {etfs.map((e, n) => (
                <span key={e.listing?.securityIdentifier ?? n}>
                  {n > 0 && ', '}
                  <a href={`/wertpapier/${e.listing?.securityIdentifier}`}>{e.name}</a>
                </span>
              ))}
              .
            </>
          )}
        </li>
        <li>
          {warrants.isLoading
            ? 'Optionsscheine darauf werden gesucht …'
            : running
              ? `${running} Optionsschein${running === 1 ? '' : 'e'} beziehen sich auf diesen Index.`
              : 'Keine Optionsscheine auf diesen Index.'}
        </li>
      </ul>
    </Confirm>
  );
}
