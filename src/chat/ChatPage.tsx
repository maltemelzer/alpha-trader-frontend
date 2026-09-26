import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useIsPhone } from '../lib/useMediaQuery';
import { useInternalLinks } from '../lib/useInternalLinks';
import { ChatPanel } from './ChatPanel';
import { useKeyboardViewport } from './useKeyboardViewport';
import './ChatPage.css';

/**
 * Messages – one screen: conversations on the left, the open chat on the right.
 * Phone: the list at /nachrichten, one chat at /nachrichten/:chatId with a back button. While the
 * on-screen keyboard is open, the chat pins itself to the visible area so the composer stays above it.
 */
export function ChatPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const isPhone = useIsPhone();
  const onLinkClick = useInternalLinks();
  const open = useCallback((id: string, replace?: boolean) => navigate(`/nachrichten/${id}`, { replace }), [navigate]);
  const keyboard = useKeyboardViewport(isPhone && !!chatId);

  return (
    <div
      className={`chat-page${keyboard ? ' chat-page--keyboard' : ''}`}
      style={keyboard ? { top: keyboard.top, height: keyboard.height } : undefined}
      onClick={onLinkClick}
    >
      <ChatPanel
        chatId={chatId}
        onSelect={open}
        onBack={isPhone ? () => navigate('/nachrichten') : undefined}
        onLeft={() => navigate('/nachrichten', { replace: true })}
        showList={!chatId}
        // Desktop opens the most recent chat right away; the phone shows the list first.
        autoOpen={!isPhone}
        phone={isPhone}
      />
    </div>
  );
}
