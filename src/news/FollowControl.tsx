import { DS } from '../ds';
import { useInterest, useSubscription, type FollowKind } from '../api/queries';
import { followState } from './derive';

const WHAT: Record<FollowKind, string> = { authors: 'Autor', companies: 'Unternehmen', hashtags: 'Hashtag' };

/**
 * Follow (SUBSCRIBE) or hide (IGNORE) the news of an author, company or hashtag; the same button
 * undoes it (DELETE). The state is read from the player's interest (no GET for subscriptions).
 */
export function FollowControl({ kind, id, name }: { kind: FollowKind; id: string | undefined; name: string }) {
  const interest = useInterest(kind, id);
  const sub = useSubscription(kind, id);
  const state = followState(interest.data?.interest);
  const busy = !id || interest.isLoading;
  return (
    <span className="follow" role="group" aria-label={`${WHAT[kind]} ${name}`}>
      <DS.Button
        size="sm"
        variant="secondary"
        aria-pressed={state === 'follow'}
        disabled={busy || state === 'ignore'}
        loading={sub.isPending && sub.variables !== 'IGNORE'}
        onClick={() => sub.mutate(state === 'follow' ? null : 'SUBSCRIBE')}
        title={state === 'follow' ? 'Nicht mehr folgen' : `${name} abonnieren`}
      >
        {state === 'follow' ? '✓ Folgst du' : 'Folgen'}
      </DS.Button>
      <DS.Button
        size="sm"
        variant="ghost"
        aria-pressed={state === 'ignore'}
        disabled={busy || state === 'follow'}
        loading={sub.isPending && sub.variables === 'IGNORE'}
        onClick={() => sub.mutate(state === 'ignore' ? null : 'IGNORE')}
        title={state === 'ignore' ? 'Nicht mehr ausblenden' : `${name} ignorieren`}
      >
        {state === 'ignore' ? 'Wieder zeigen' : 'Ausblenden'}
      </DS.Button>
      {sub.isError && (
        <span className="follow__error" role="alert">
          Nicht gespeichert: {sub.error.message}
        </span>
      )}
    </span>
  );
}
