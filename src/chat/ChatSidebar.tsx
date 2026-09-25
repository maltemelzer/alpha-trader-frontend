import { useNavigate } from 'react-router';
import { DS } from '../ds';
import { useInternalLinks } from '../lib/useInternalLinks';
import { ChatPanel } from './ChatPanel';
import './ChatSidebar.css';

export const CHAT_SIDEBAR_ID = 'chat-sidebar';

/**
 * Chat docked on the right of the desktop shell: conversations → one chat → back. Same panel as the
 * chat page (the design system's ChatWindow switches by its own width). Links in messages open in the
 * main column; the sidebar stays.
 */
export function ChatSidebar({
  chatId,
  onChatId,
  onClose,
}: {
  chatId: string | undefined;
  onChatId: (id: string | undefined) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const onLinkClick = useInternalLinks();
  return (
    <aside id={CHAT_SIDEBAR_ID} className="chat-sidebar" aria-label="Chat">
      <div className="chat-sidebar__bar">
        <h2 className="chat-sidebar__title">Chat</h2>
        <DS.Button
          variant="ghost"
          size="sm"
          iconEnd={<DS.Icon name="extern" size={16} />}
          onClick={() => navigate(chatId ? `/nachrichten/${chatId}` : '/nachrichten')}
        >
          Vollbild
        </DS.Button>
        <DS.Button variant="ghost" size="sm" aria-label="Chat-Leiste schließen (Taste C)" title="Schließen (C)" onClick={onClose}>
          <DS.Icon name="schliessen" size={16} />
        </DS.Button>
      </div>
      <div className="chat-sidebar__body" onClick={onLinkClick}>
        <ChatPanel
          compact
          chatId={chatId}
          onSelect={(id) => onChatId(id)}
          onBack={() => onChatId(undefined)}
          onLeft={() => onChatId(undefined)}
          showList={!chatId}
        />
      </div>
    </aside>
  );
}
