import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { DS } from '../ds';
import { useAddChatMember, useChatMembers } from '../api/queries';
import type { ChatMembershipView, UsernameView } from '../api/types';
import { UserPicker } from './UserPicker';

const ROLES: Record<ChatMembershipView['role'], string> = {
  OWNER: 'Inhaber',
  DEPUTY: 'Stellvertreter',
  MODERATOR: 'Moderator',
  AUTHOR: '',
  READER: 'Nur lesen',
};
const ORDER: ChatMembershipView['role'][] = ['OWNER', 'DEPUTY', 'MODERATOR', 'AUTHOR', 'READER'];

/** Members of a group or lobby: online first, then by role and name. Owners of groups can invite. */
export function MembersSheet({
  open,
  onClose,
  chatId,
  canInvite,
}: {
  open: boolean;
  onClose: () => void;
  chatId: string;
  canInvite: boolean;
}) {
  const members = useChatMembers(chatId, open);
  const add = useAddChatMember();
  const [invite, setInvite] = useState<UsernameView[]>([]);

  const sorted = useMemo(
    () =>
      [...(members.data ?? [])].sort(
        (a, b) =>
          Number(b.online) - Number(a.online) ||
          ORDER.indexOf(a.role) - ORDER.indexOf(b.role) ||
          (a.member.username ?? '').localeCompare(b.member.username ?? ''),
      ),
    [members.data],
  );
  const online = sorted.filter((m) => m.online).length;

  return (
    <DS.Sheet open={open} onClose={onClose} title="Mitglieder" side="auto" width={380}>
      {canInvite && (
        <div className="chat-form">
          <UserPicker
            label="Hinzufügen"
            value={invite}
            onChange={setInvite}
            exclude={sorted.map((m) => m.member.username ?? '')}
          />
          {invite.length > 0 && (
            <DS.Button
              variant="secondary"
              loading={add.isPending}
              onClick={async () => {
                for (const u of invite) await add.mutateAsync({ chatId, userId: u.id! });
                setInvite([]);
              }}
            >
              {invite.length === 1 ? 'Einladen' : `${invite.length} einladen`}
            </DS.Button>
          )}
        </div>
      )}
      {members.isLoading ? (
        <DS.Loading rows={8} />
      ) : (
        <>
          <p className="chat-members__count">
            {sorted.length.toLocaleString('de-DE')} Mitglieder · {online.toLocaleString('de-DE')} online
          </p>
          <ul className="chat-members">
            {sorted.slice(0, 300).map((m) => (
              <li key={m.id}>
                <DS.Avatar name={m.member.username} size={28} />
                <Link to={`/spieler/${encodeURIComponent(m.member.username ?? '')}`} onClick={onClose}>
                  {m.member.username}
                </Link>
                {m.online && <span className="chat-members__online">online</span>}
                {ROLES[m.role] && <span className="chat-members__role">{ROLES[m.role]}</span>}
              </li>
            ))}
          </ul>
          {sorted.length > 300 && <p className="chat-members__count">… und {sorted.length - 300} weitere</p>}
        </>
      )}
    </DS.Sheet>
  );
}
