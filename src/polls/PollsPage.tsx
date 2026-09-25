import { useSearchParams } from 'react-router';
import { DS } from '../ds';
import { useMyPolls, usePollActions, type PollFilter } from '../api/queries';
import { useInternalLinks } from '../lib/useInternalLinks';

const FILTERS: PollFilter[] = ['NOT_VOTED', 'PARTIALLY_VOTED', 'VOTED', 'INITIATED'];

/** Polls of the companies the player holds shares in: vote, execute results, delete own polls. */
export function PollsPage() {
  const [params, setParams] = useSearchParams();
  const onLinkClick = useInternalLinks();
  const filter = (FILTERS.find((f) => f === params.get('filter')) ?? 'NOT_VOTED') as PollFilter;
  const polls = useMyPolls(filter);
  const open = useMyPolls('NOT_VOTED');
  const { vote, voteAll, execute, remove } = usePollActions();
  const error = vote.error ?? voteAll.error ?? execute.error ?? remove.error;

  return (
    <div className="page" onClick={onLinkClick}>
      <DS.PageHeader
        size="md"
        title="Abstimmungen"
        meta={open.data ? <span>{open.data.totalElements} offen</span> : '\u00a0'}
      />
      <DS.Card className="panel">
        <div className="panel__fill scroll">
          {error && <DS.Banner variant="error">Aktion fehlgeschlagen: {error.message}</DS.Banner>}
          {polls.isLoading ? (
            <DS.Loading rows={6} label="Abstimmungen werden geladen" />
          ) : (
            <DS.PollList
              polls={polls.data?.content ?? []}
              filter={filter}
              onFilterChange={(f) => setParams({ filter: f }, { replace: true })}
              counts={{ NOT_VOTED: open.data?.totalElements }}
              onVote={(p, type, voices) => vote.mutate({ pollId: p.id, type, voices })}
              onVoteAll={open.data?.totalElements ? (type, onlyHarmless) => voteAll.mutate({ type, onlyHarmless }) : undefined}
              onExecute={(p) => execute.mutate(p.id)}
              onDelete={(p) => remove.mutate(p.id)}
              hrefFor={(e, kind) =>
                kind === 'company' ? (e.securityIdentifier ? `/wertpapier/${e.securityIdentifier}` : null) : `/spieler/${encodeURIComponent(e.username)}`
              }
              emptyText={
                <DS.EmptyState compact as="h3" title={filter === 'NOT_VOTED' ? 'Keine offenen Abstimmungen' : 'Keine Abstimmungen'}>
                  Hauptversammlungen deiner Beteiligungen erscheinen hier.
                </DS.EmptyState>
              }
            />
          )}
        </div>
      </DS.Card>
    </div>
  );
}
