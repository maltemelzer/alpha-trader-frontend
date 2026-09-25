import { useChatInboxTopic, useChatListSync, useMyChats } from '../api/queries';
import type { ChatView, MessageView } from '../api/types';

/**
 * Listens for new messages in every joined direct and group chat (lobbies are too busy and never
 * count as unread), so the unread count in the header rises the moment a message arrives – not only
 * with the next poll of the chat list. Renders nothing.
 */
export function ChatLive({ me, onFresh }: { me: string; onFresh?: (chat: ChatView, m: MessageView) => void }) {
  const chats = useMyChats();
  useChatListSync();
  return (
    <>
      {(chats.data ?? [])
        .filter((c) => !c.publicChat)
        .map((c) => (
          <ChatTopic key={c.id} chat={c} me={me} onFresh={onFresh} />
        ))}
    </>
  );
}

function ChatTopic({ chat, me, onFresh }: { chat: ChatView; me: string; onFresh?: (chat: ChatView, m: MessageView) => void }) {
  useChatInboxTopic(chat.id, me, onFresh && ((m) => onFresh(chat, m)));
  return null;
}
