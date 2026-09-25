import { useState } from 'react';
import { DS } from '../ds';
import { useCreateChat } from '../api/queries';
import type { UsernameView } from '../api/types';
import { UserPicker } from './UserPicker';

/** New conversation: one person → direct chat; several people or a name → group chat. */
export function NewChatDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (chatId: string) => void;
}) {
  const [users, setUsers] = useState<UsernameView[]>([]);
  const [name, setName] = useState('');
  const create = useCreateChat();
  const group = users.length > 1 || name.trim() !== '';

  const close = () => {
    setUsers([]);
    setName('');
    create.reset();
    onClose();
  };

  return (
    <DS.Dialog
      open={open}
      onClose={close}
      dismissible={!create.isPending}
      title="Neue Unterhaltung"
      description="Eine Person für eine Direktnachricht, mehrere für eine Gruppe."
      actions={
        <>
          <DS.Button variant="secondary" onClick={close} disabled={create.isPending}>
            Abbrechen
          </DS.Button>
          <DS.Button
            variant="primary"
            disabled={!users.length}
            loading={create.isPending}
            onClick={() =>
              create.mutate(
                { userIds: users.map((u) => u.id!), chatName: group ? name.trim() || undefined : undefined },
                {
                  onSuccess: (id) => {
                    setUsers([]);
                    setName('');
                    onCreated(id);
                  },
                },
              )
            }
          >
            {group ? 'Gruppe anlegen' : 'Unterhaltung beginnen'}
          </DS.Button>
        </>
      }
    >
      <div className="chat-form">
        <UserPicker label="Mit" value={users} onChange={setUsers} />
        {users.length > 1 && (
          <DS.Input label="Name der Gruppe" optional value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        )}
        {create.isError && <DS.Banner variant="error">Anlegen fehlgeschlagen: {create.error.message}</DS.Banner>}
      </div>
    </DS.Dialog>
  );
}
