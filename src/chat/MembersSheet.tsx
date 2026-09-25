import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { DS } from '../ds';
import { useAddChatMember, useChatAdmin, useChatMembers } from '../api/queries';
import type { ChatMembershipView, ChatView, UsernameView } from '../api/types';
import { CHAT_NAME_MAX, canManageChat, canRemoveMember, chatNameError, myChatRole, type ChatKind } from './derive';
import { UserPicker } from './UserPicker';

const ROLES: Record<ChatMembershipView['role'], string> = {
  OWNER: 'Inhaber',
  DEPUTY: 'Stellvertreter',
  MODERATOR: 'Moderator',
  AUTHOR: '',
  READER: 'Nur lesen',
};
const ORDER: ChatMembershipView['role'][] = ['OWNER', 'DEPUTY', 'MODERATOR', 'AUTHOR', 'READER'];

/**
 * Members of a group or lobby: online first, then by role and name. Owners of groups can invite;
 * owner and deputy of a group can rename it and remove members below their own role (with confirmation).
 */
export function MembersSheet({
  open,
  onClose,
  chat,
  kind,
  me,
  canInvite,
}: {
  open: boolean;
  onClose: () => void;
  chat: ChatView;
  kind: ChatKind;
  me?: string;
  canInvite: boolean;
}) {
  const chatId = chat.id;
  const members = useChatMembers(chatId, open);
  const add = useAddChatMember();
  const admin = useChatAdmin(chatId);
  const [invite, setInvite] = useState<UsernameView[]>([]);
  const [removing, setRemoving] = useState<ChatMembershipView | null>(null);
  const role = myChatRole(chat, members.data, me);
  const manage = canManageChat(kind, role);

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
      {manage && <RenameForm key={chat.chatName ?? ''} chat={chat} rename={admin.rename} />}
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
                {canRemoveMember(kind, role, m, me) && (
                  <DS.Button variant="ghost" size="sm" aria-label={`${m.member.username} entfernen`} onClick={() => setRemoving(m)}>
                    Entfernen
                  </DS.Button>
                )}
              </li>
            ))}
          </ul>
          {sorted.length > 300 && <p className="chat-members__count">… und {sorted.length - 300} weitere</p>}
        </>
      )}
      <DS.Dialog
        open={!!removing}
        role="alertdialog"
        size="sm"
        onClose={() => !admin.remove.isPending && setRemoving(null)}
        title={`${removing?.member.username ?? ''} entfernen?`}
        description={`${removing?.member.username ?? ''} wird aus „${chat.chatName ?? 'der Gruppe'}“ entfernt und sieht keine neuen Nachrichten mehr.`}
        actions={
          <>
            <DS.Button variant="ghost" disabled={admin.remove.isPending} onClick={() => setRemoving(null)}>
              Abbrechen
            </DS.Button>
            <DS.Button
              variant="danger"
              loading={admin.remove.isPending}
              onClick={() => removing && admin.remove.mutate(removing.id, { onSuccess: () => setRemoving(null) })}
            >
              Entfernen
            </DS.Button>
          </>
        }
      >
        {admin.remove.isError && <DS.Banner variant="error">Nicht entfernt: {admin.remove.error.message}</DS.Banner>}
      </DS.Dialog>
    </DS.Sheet>
  );
}

/** Rename the group; the field starts with the current name (remounted when it changes). */
function RenameForm({ chat, rename }: { chat: ChatView; rename: ReturnType<typeof useChatAdmin>['rename'] }) {
  const [name, setName] = useState(chat.chatName ?? '');
  const [touched, setTouched] = useState(false);
  const error = chatNameError(name, chat.chatName);
  const changed = name.trim() !== (chat.chatName ?? '').trim();
  return (
    <form
      className="chat-form chat-rename"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (!error) rename.mutate({ chat, name: name.trim() });
      }}
    >
      <DS.Input
        label="Name der Gruppe"
        value={name}
        maxLength={CHAT_NAME_MAX}
        onChange={(e) => setName(e.target.value)}
        error={touched && changed && error ? error : undefined}
      />
      <DS.Button type="submit" variant="secondary" size="sm" disabled={!changed} loading={rename.isPending}>
        Umbenennen
      </DS.Button>
      {rename.isError && <DS.Banner variant="error">Nicht umbenannt: {rename.error.message}</DS.Banner>}
    </form>
  );
}
