import { Link } from 'react-router';
import { DS } from '../ds';
import { useChatBlock, useChatBlocks } from '../api/queries';
import { sortedBlocks } from './blocks';

/** „Blockierte Spieler“: everyone I blocked; unblocking shows their messages again. */
export function BlockedSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const blocks = useChatBlocks();
  const { unblock } = useChatBlock();
  const list = sortedBlocks(blocks.data);
  return (
    <DS.Sheet open={open} onClose={onClose} title="Blockierte Spieler">
      <p className="chat-members__count">
        Ihre Nachrichten siehst du in keinem Chat, sie zählen nicht als ungelesen. Sie erfahren nichts davon.
      </p>
      {blocks.isLoading ? (
        <DS.Loading rows={4} label="Blockierte Spieler werden geladen" />
      ) : blocks.isError ? (
        <DS.Banner variant="error">Die Liste konnte nicht geladen werden.</DS.Banner>
      ) : list.length ? (
        <ul className="chat-members">
          {list.map((u) => (
            <li key={u.username}>
              <DS.Avatar name={u.username} size={28} />
              <Link to={`/spieler/${encodeURIComponent(u.username ?? '')}`} onClick={onClose}>
                {u.username}
              </Link>
              <DS.Button
                variant="secondary"
                size="sm"
                aria-label={`${u.username} entsperren`}
                loading={unblock.isPending && unblock.variables === u.username}
                disabled={unblock.isPending}
                onClick={() => unblock.mutate(u.username ?? '')}
              >
                Entsperren
              </DS.Button>
            </li>
          ))}
        </ul>
      ) : (
        <DS.EmptyState compact title="Niemand blockiert" as="h3">
          Tipp im Chat auf den Kreis eines Spielers (oder fahr mit der Maus darüber) und wähle „Blockieren …“.
        </DS.EmptyState>
      )}
      {unblock.isError && <DS.Banner variant="error">Nicht entsperrt: {unblock.error.message}</DS.Banner>}
    </DS.Sheet>
  );
}
