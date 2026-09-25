import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { DS } from '../ds';
import {
  useChatMessages,
  useChatRooms,
  useJoinChat,
  useLeaveChat,
  useMarkChatRead,
  useMe,
  useMyChats,
  useSendMessage,
} from '../api/queries';
import { useIsPhone } from '../lib/useMediaQuery';
import { useInternalLinks } from '../lib/useInternalLinks';
import { chatKind, chatTitle, toConversations, toThread } from './derive';
import { MembersSheet } from './MembersSheet';
import { NewChatDialog } from './NewChatDialog';
import './ChatPage.css';

const TICKER = /\$([A-Z][A-Z0-9]{1,9})\b/g;

/**
 * Messages – one screen: conversations on the left, the open chat on the right.
 * Phone: the list at /nachrichten, one chat at /nachrichten/:chatId with a back button.
 */
export function ChatPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const isPhone = useIsPhone();
  const onLinkClick = useInternalLinks();

  const meQuery = useMe();
  const me = meQuery.data?.username;
  const chats = useMyChats();
  const rooms = useChatRooms();
  const join = useJoinChat();
  const [filter, setFilter] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Desktop opens the most recent chat right away; the phone shows the list first.
  const groups = useMemo(
    () => toConversations(chats.data ?? [], { me, activeId: chatId, filter, rooms: rooms.data }),
    [chats.data, me, chatId, filter, rooms.data],
  );
  const firstId = groups[0]?.items[0]?.id;
  useEffect(() => {
    if (!chatId && !isPhone && firstId && !filter) navigate(`/nachrichten/${firstId}`, { replace: true });
  }, [chatId, isPhone, firstId, filter, navigate]);

  const chat = chats.data?.find((c) => c.id === chatId);
  // A public room the player has not joined: no messages until he joins.
  const room = !chat && chats.data ? rooms.data?.find((r) => r.id === chatId) : undefined;
  const kind = chat ? chatKind(chat) : room ? 'public' : 'direct';

  const list = (
    <div className="chat-side">
      <div className="chat-side__tools">
        <DS.Input
          aria-label="Unterhaltungen durchsuchen"
          placeholder="Suchen"
          size="sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <DS.Button size="sm" variant="secondary" onClick={() => setNewOpen(true)}>
          Neu
        </DS.Button>
      </div>
      {chats.isLoading ? (
        <DS.Loading rows={6} label="Unterhaltungen werden geladen" />
      ) : groups.length ? (
        <DS.ConversationList
          groups={groups}
          onSelect={(c) => {
            setFilter('');
            navigate(`/nachrichten/${c.id}`);
          }}
        />
      ) : (
        <DS.EmptyState compact title={filter ? 'Nichts gefunden' : 'Noch keine Unterhaltungen'} as="h3" />
      )}
    </div>
  );

  const leave = useLeaveChat();
  const actions = chat && (
    <>
      {kind !== 'direct' && (
        <DS.Button variant="ghost" size="sm" onClick={() => setMembersOpen(true)}>
          Mitglieder
        </DS.Button>
      )}
      {(
        <DS.Button
          variant="ghost"
          size="sm"
          loading={leave.isPending}
          onClick={() =>
            leave.mutate(chat.id, {
              onSuccess: () => navigate('/nachrichten', { replace: true }),
              onError: (e) => setError(`Verlassen fehlgeschlagen: ${e.message}`),
            })
          }
        >
          Verlassen
        </DS.Button>
      )}
    </>
  );

  return (
    <div className="chat-page" onClick={onLinkClick}>
      <DS.ChatWindow
        height="100%"
        title={chat ? chatTitle(chat, me) : room ? room.name : chatId ? '…' : 'Nachrichten'}
        // Head and composer keep their size from the first frame on: while the
        // chats load (and the desktop redirects to the newest chat) placeholders hold the space, so the
        // thread below does not jump. The public-chat rule sits in the composer's placeholder for the same reason.
        subtitle={chat ? subtitle(kind) : room ? `Öffentlicher Raum · ${room.numberOfMembers.toLocaleString('de-DE')} Mitglieder` : '\u00a0'}
        actions={actions}
        list={list}
        mobileShowList={!chatId}
        onBack={isPhone ? () => navigate('/nachrichten') : undefined}
        composer={
          chatId && !room ? (
            <Composer chatId={chatId} readonly={!!chat?.readonly} publicChat={kind === 'public' && !!chat} onError={setError} />
          ) : !chatId && !isPhone && (chats.isLoading || firstId) ? (
            <DS.ChatComposer disabled placeholder="Unterhaltung wird geöffnet …" />
          ) : undefined
        }
      >
        {room ? (
          <DS.EmptyState
            title={`${room.name} beitreten`}
            action={
              <DS.Button
                variant="primary"
                loading={join.isPending}
                disabled={!meQuery.data?.id}
                onClick={() =>
                  join.mutate(
                    { chatId: room.id, userId: meQuery.data!.id! },
                    { onError: (e) => setError(`Beitreten fehlgeschlagen: ${e.message}`) },
                  )
                }
              >
                Beitreten
              </DS.Button>
            }
          >
            Nachrichten eines öffentlichen Raums siehst du erst als Mitglied. Du kannst ihn jederzeit wieder verlassen.
          </DS.EmptyState>
        ) : chatId ? (
          <Thread key={chatId} chatId={chatId} me={me} direct={kind === 'direct'} unread={chat?.numOfUnreadMessages ?? 0} />
        ) : (
          <DS.EmptyState title="Keine Unterhaltung gewählt">Links eine Unterhaltung wählen oder eine neue beginnen.</DS.EmptyState>
        )}
      </DS.ChatWindow>

      <NewChatDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={(id) => {
          setNewOpen(false);
          navigate(`/nachrichten/${id}`);
        }}
      />
      {chat && kind !== 'direct' && (
        <MembersSheet
          open={membersOpen}
          onClose={() => setMembersOpen(false)}
          chatId={chat.id}
          canInvite={kind === 'group' && chat.owner?.username === me}
        />
      )}
      {error && (
        <DS.ToastRegion>
          <DS.Toast variant="error" title="Chat" onClose={() => setError(null)}>
            {error}
          </DS.Toast>
        </DS.ToastRegion>
      )}
    </div>
  );
}

const subtitle = (kind: string) =>
  kind === 'public' ? 'Öffentlicher Chat' : kind === 'group' ? 'Gruppe' : 'Direktnachricht';

function Thread({ chatId, me, direct, unread }: { chatId: string; me?: string; direct: boolean; unread: number }) {
  const q = useChatMessages(chatId);
  const markRead = useMarkChatRead();
  const topRef = useRef<HTMLDivElement>(null);
  const restore = useRef<number | null>(null);

  const messages = useMemo(() => (q.data ? q.data.pages.slice().reverse().flat() : []), [q.data]);
  const thread = useMemo(() => toThread(messages, { me, direct }), [messages, me, direct]);
  const tickers = useMemo(() => {
    const out: Record<string, { href: string }> = {};
    for (const m of messages) for (const [, t] of (m.content ?? '').matchAll(TICKER)) out[t] = { href: `/wertpapier/${t}` };
    return out;
  }, [messages]);

  // Opening a chat (or a new message arriving while it is open) marks it read.
  const { mutate } = markRead;
  useEffect(() => {
    if (unread > 0) mutate(chatId);
  }, [chatId, unread, mutate]);

  // Older pages are prepended: keep the view where it was instead of jumping.
  const scroller = () => topRef.current?.closest('.bnk-chatwin__scroll') as HTMLElement | null;
  const loadOlder = () => {
    const s = scroller();
    if (!q.hasNextPage || q.isFetchingNextPage) return;
    if (s) restore.current = s.scrollHeight - s.scrollTop;
    void q.fetchNextPage();
  };
  const pages = q.data?.pages.length ?? 0;
  useLayoutEffect(() => {
    const s = scroller();
    if (s && restore.current != null) {
      s.scrollTop = s.scrollHeight - restore.current;
      restore.current = null;
    }
  }, [pages]);

  // Scrolling to the top loads the next older page.
  const loadRef = useRef(loadOlder);
  useEffect(() => {
    loadRef.current = loadOlder;
  });
  useEffect(() => {
    const el = topRef.current;
    const root = scroller();
    if (!el || !root) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && loadRef.current(), { root, rootMargin: '200px 0px 0px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [q.isSuccess]);

  if (q.isLoading) return <DS.Loading rows={8} label="Nachrichten werden geladen" />;
  if (q.isError) return <DS.Banner variant="error">Nachrichten konnten nicht geladen werden.</DS.Banner>;
  return (
    <>
      <div ref={topRef} className="chat-older">
        {q.hasNextPage ? (
          <DS.Button variant="ghost" size="sm" loading={q.isFetchingNextPage} onClick={loadOlder}>
            Ältere Nachrichten
          </DS.Button>
        ) : messages.length ? (
          <span>Anfang der Unterhaltung</span>
        ) : null}
      </div>
      {thread.length ? (
        <DS.ChatThread messages={thread} tickers={tickers} showNames={!direct} />
      ) : (
        <DS.EmptyState compact title="Noch keine Nachrichten" as="h3">
          Schreib die erste.
        </DS.EmptyState>
      )}
    </>
  );
}

function Composer({ chatId, readonly, publicChat, onError }: { chatId: string; readonly: boolean; publicChat: boolean; onError: (e: string) => void }) {
  const send = useSendMessage();
  // Keep a draft per chat while switching between conversations.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  return (
    <DS.ChatComposer
      key={chatId}
      value={drafts[chatId] ?? ''}
      onChange={(v) => setDrafts((d) => ({ ...d, [chatId]: v }))}
      disabled={readonly || send.isPending}
      placeholder={
        readonly ? 'Nur lesen – hier kann nicht geschrieben werden' : publicChat ? 'Nachricht an alle – keine Beleidigungen, keine Kaufempfehlungen gegen Geld' : undefined
      }
      onSend={(content) =>
        send.mutate(
          { chatId, content },
          {
            onError: (e) => {
              setDrafts((d) => ({ ...d, [chatId]: content }));
              onError(`Nachricht nicht gesendet: ${e.message}`);
            },
          },
        )
      }
    />
  );
}
