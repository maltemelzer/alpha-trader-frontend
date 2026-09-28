import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DS } from '../ds';
import {
  useChatMessages,
  useChatRooms,
  useJoinChat,
  useLeaveChat,
  useListings,
  useMarkChatRead,
  useMe,
  useMyChats,
  useSendMessage,
} from '../api/queries';
import { chatKind, chatTitle, toConversations, toThread } from './derive';
import { AssetEmbed } from './AssetEmbed';
import { MembersSheet } from './MembersSheet';
import { mentionedAsins } from './mentions';
import { useMentions } from './useMentions';
import { NewChatDialog } from './NewChatDialog';
import './ChatPage.css';

export interface ChatPanelProps {
  /** the open chat, if any */
  chatId?: string;
  /** open a chat (`replace`: automatic, not a user step) */
  onSelect: (chatId: string, replace?: boolean) => void;
  /** back to the list – shown whenever the window is narrow (phone, sidebar) */
  onBack?: () => void;
  /** after leaving the open chat */
  onLeft: () => void;
  /** narrow window: show the list instead of the chat */
  showList: boolean;
  /** open the newest chat when none is chosen (wide chat page) */
  autoOpen?: boolean;
  /** sidebar: fewer head actions, the send button stays outlined (the page may have its brass button) */
  compact?: boolean;
  /** phone: head actions in one ⋯ menu, short placeholder, rules in the menu */
  phone?: boolean;
}

/**
 * Conversations and one open chat – the chat page and the sidebar share it. The design system's
 * ChatWindow switches between list and chat by its own width (container query), not the viewport.
 */
export function ChatPanel({ chatId, onSelect, onBack, onLeft, showList, autoOpen, compact, phone }: ChatPanelProps) {
  const meQuery = useMe();
  const me = meQuery.data?.username;
  const chats = useMyChats();
  const rooms = useChatRooms();
  const join = useJoinChat();
  const leave = useLeaveChat();
  const [filter, setFilter] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(
    () => toConversations(chats.data ?? [], { me, activeId: chatId, filter, rooms: rooms.data }),
    [chats.data, me, chatId, filter, rooms.data],
  );
  const firstId = groups[0]?.items[0]?.id;
  useEffect(() => {
    if (autoOpen && !chatId && firstId && !filter) onSelect(firstId, true);
  }, [autoOpen, chatId, firstId, filter, onSelect]);

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
            if (c.id) onSelect(c.id);
          }}
        />
      ) : (
        <DS.EmptyState compact title={filter ? 'Nichts gefunden' : 'Noch keine Unterhaltungen'} as="h3" />
      )}
    </div>
  );

  const leaveChat = () =>
    chat &&
    leave.mutate(chat.id, {
      onSuccess: onLeft,
      onError: (e) => setError(`Verlassen fehlgeschlagen: ${e.message}`),
    });

  // Phone: one ⋯ menu keeps the head to a single row, so the thread gets the height.
  const menu = chat && phone && (
    <DS.DropdownMenu
      className="chat-menu"
      variant="ghost"
      align="end"
      label={
        <>
          <span aria-hidden="true">⋯</span>
          <span className="bnk-sr">Chat-Aktionen</span>
        </>
      }
      items={[
        ...(kind === 'public' ? [{ heading: 'Regeln: keine Beleidigungen, keine Kaufempfehlungen gegen Geld' }] : []),
        ...(kind !== 'direct' ? [{ label: 'Mitglieder', onSelect: () => setMembersOpen(true) }] : []),
        ...(kind !== 'direct' ? [{ divider: true }] : []),
        { label: leave.isPending ? 'Verlässt …' : 'Chat verlassen', danger: true, disabled: leave.isPending, onSelect: leaveChat },
      ]}
    />
  );

  const actions =
    menu ||
    (chat && (
      <>
        {kind !== 'direct' && (
          <DS.Button variant="ghost" size="sm" onClick={() => setMembersOpen(true)}>
            Mitglieder
          </DS.Button>
        )}
        {!compact && (
          <DS.Button variant="ghost" size="sm" loading={leave.isPending} onClick={leaveChat}>
            Verlassen
          </DS.Button>
        )}
      </>
    ));

  return (
    <>
      <DS.ChatWindow
        height="100%"
        title={chat ? chatTitle(chat, me) : room ? room.name : chatId ? '…' : 'Nachrichten'}
        // Head and composer keep their size from the first frame on: while the
        // chats load (and the desktop redirects to the newest chat) placeholders hold the space, so the
        // thread below does not jump. The public-chat rule sits in the composer's placeholder for the same reason.
        subtitle={
          chat
            ? subtitle(kind)
            : room
              ? `${phone ? 'Öffentlich' : 'Öffentlicher Raum'} · ${room.numberOfMembers.toLocaleString('de-DE')} Mitglieder`
              : '\u00a0'
        }
        actions={actions}
        list={list}
        mobileShowList={showList}
        onBack={onBack}
        composer={
          chatId && !room ? (
            <Composer
              chatId={chatId}
              readonly={!!chat?.readonly}
              publicChat={kind === 'public' && !!chat}
              secondary={compact}
              short={phone}
              onError={setError}
            />
          ) : !chatId && autoOpen && (chats.isLoading || firstId) ? (
            <DS.ChatComposer disabled placeholder="Unterhaltung wird geöffnet …" />
          ) : undefined
        }
      >
        {room ? (
          <DS.EmptyState
            title={`${room.name} beitreten`}
            action={
              <DS.Button
                variant={compact ? 'secondary' : 'primary'}
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
          onSelect(id);
        }}
      />
      {chat && kind !== 'direct' && (
        <MembersSheet
          open={membersOpen}
          onClose={() => setMembersOpen(false)}
          chat={chat}
          kind={kind}
          me={me}
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
    </>
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
  // #ASIN / !ASIN (old: $ASIN) link the security; the name comes as tooltip (listings are cached for the session).
  const asins = useMemo(() => [...new Set(messages.flatMap((m) => mentionedAsins(m.content)))], [messages]);
  const listings = useListings(asins);
  const tickers = useMemo(
    () => Object.fromEntries(asins.map((a) => [a, { href: `/wertpapier/${a}`, name: listings[a]?.name }])),
    [asins, listings],
  );
  const renderEmbed = useCallback((asin: string) => <AssetEmbed asin={asin} />, []);

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
        <DS.ChatThread messages={thread} tickers={tickers} renderEmbed={renderEmbed} showNames={!direct} />
      ) : (
        <DS.EmptyState compact title="Noch keine Nachrichten" as="h3">
          Schreib die erste.
        </DS.EmptyState>
      )}
    </>
  );
}

function Composer({
  chatId,
  readonly,
  publicChat,
  secondary,
  short,
  onError,
}: {
  chatId: string;
  readonly: boolean;
  publicChat: boolean;
  secondary?: boolean;
  /** phone: a placeholder that fits the narrow field (the public rules sit in the ⋯ menu) */
  short?: boolean;
  onError: (e: string) => void;
}) {
  const send = useSendMessage();
  // Keep a draft per chat while switching between conversations.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const value = drafts[chatId] ?? '';
  const setValue = (v: string) => setDrafts((d) => ({ ...d, [chatId]: v }));
  // #: search and link a security · !: the same, shown as a card in the chat
  const input = useRef<HTMLTextAreaElement>(null);
  const mentions = useMentions(value, setValue, input);
  return (
    <DS.ChatComposer
      key={chatId}
      ref={input}
      value={value}
      onChange={(v) => {
        mentions.onInput();
        setValue(v);
      }}
      onKeyDown={mentions.onKeyDown}
      popup={mentions.popup}
      inputProps={mentions.inputProps}
      hint={short ? '# Wertpapier · ! Karte' : '# verlinkt ein Wertpapier · ! zeigt es als Karte · Enter senden'}
      disabled={readonly || send.isPending}
      sendVariant={secondary ? 'secondary' : undefined}
      placeholder={
        readonly
          ? short
            ? 'Nur lesen'
            : 'Nur lesen – hier kann nicht geschrieben werden'
          : publicChat
            ? short
              ? 'Nachricht an alle'
              : 'Nachricht an alle – keine Beleidigungen, keine Kaufempfehlungen gegen Geld'
            : undefined
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
