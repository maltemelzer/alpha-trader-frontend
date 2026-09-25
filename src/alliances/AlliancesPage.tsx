import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { DS } from '../ds';
import { useAllianceActions, useAlliances, useMyAllianceMembership } from '../api/queries';
import { AllianceForm } from './AllianceForm';
import './AlliancePage.css';

/** All alliances, biggest first; member count as a bar so sizes compare at a glance. Players without one can found one. */
export function AlliancesPage() {
  const navigate = useNavigate();
  const alliances = useAlliances();
  const mine = useMyAllianceMembership();
  const { create } = useAllianceActions();
  const [params, setParams] = useSearchParams();
  const founding = params.get('gruenden') === '1';
  const [q, setQ] = useState('');
  const myId = mine.data?.alliance.id;
  const rows = useMemo(() => {
    const f = q.trim().toLowerCase();
    return [...(alliances.data?.content ?? [])]
      .filter((a) => !f || a.name.toLowerCase().includes(f))
      .sort((a, b) => (b.numberOfMembers ?? 0) - (a.numberOfMembers ?? 0));
  }, [alliances.data, q]);
  const max = Math.max(1, ...rows.map((a) => a.numberOfMembers ?? 0));

  return (
    <div className="page">
      <DS.PageHeader
        size="md"
        title="Allianzen"
        meta={alliances.data ? <span>{alliances.data.totalElements} Allianzen</span> : undefined}
        actions={
          <>
            <DS.Input aria-label="Allianz suchen" placeholder="Suchen" size="sm" value={q} onChange={(e) => setQ(e.target.value)} />
            {myId ? (
              <DS.Button size="sm" onClick={() => navigate(`/allianz/${myId}`)}>
                Meine Allianz
              </DS.Button>
            ) : (
              mine.isSuccess && (
                <DS.Button variant="primary" size="sm" onClick={() => setParams({ gruenden: '1' }, { replace: true })}>
                  Allianz gründen
                </DS.Button>
              )
            )}
          </>
        }
      />
      <DS.Card flush className="panel">
        <div className="panel__fill scroll alliances__scroll">
          {alliances.isLoading ? (
            <DS.Loading rows={10} />
          ) : (
            <ul className="alliances">
              {rows.map((a) => (
                <li key={a.id} className={a.id === myId ? 'is-mine' : undefined}>
                  <Link to={`/allianz/${a.id}`} className="alliances__name">
                    {a.name}
                  </Link>
                  <span className="alliances__bar">
                    <DS.ProgressBar
                      value={a.numberOfMembers ?? 0}
                      max={max}
                      size="sm"
                      variant="neutral"
                      aria-label={`${a.numberOfMembers} Mitglieder`}
                      valueText={`${a.numberOfMembers ?? 0} Mitglieder`}
                    />
                  </span>
                  <span className="alliances__meta">
                    {a.achievementCount ?? 0}/{a.achievementTotal ?? 0} Erfolge
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DS.Card>
      <DS.Sheet open={founding} onClose={() => !create.isPending && setParams({}, { replace: true })} title="Allianz gründen" side="auto" width={520}>
        <AllianceForm
          submitLabel="Allianz gründen"
          loading={create.isPending}
          error={create.isError ? `Nicht gegründet: ${create.error.message}` : undefined}
          onCancel={() => setParams({}, { replace: true })}
          onSubmit={(v) => create.mutate(v, { onSuccess: (a) => navigate(a?.id ? `/allianz/${a.id}` : '/allianzen') })}
        />
      </DS.Sheet>
    </div>
  );
}
