import { useNavigate } from 'react-router';
import { useCreateChat, useMyChats } from '../api/queries';
import type { UsernameView } from '../api/types';

/** Opens the direct chat with a player – the existing one, or a new one on first contact. */
export function useDirectChat() {
  const navigate = useNavigate();
  const chats = useMyChats();
  const create = useCreateChat();
  const open = (user: UsernameView) => {
    const existing = chats.data?.find(
      (c) => !c.groupChat && !c.publicChat && c.participants.some((p) => p.id === user.id),
    );
    if (existing) return navigate(`/nachrichten/${existing.id}`);
    create.mutate({ userIds: [user.id!] }, { onSuccess: (id) => navigate(`/nachrichten/${id}`) });
  };
  return { open, pending: create.isPending, error: create.error };
}
