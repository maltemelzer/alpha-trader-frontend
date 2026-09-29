import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { DS } from '../ds';
import { useChatUnread, useMe, usePortfolio } from '../api/queries';
import type { ChatView, MessageView } from '../api/types';
import { bookValue } from '../organisation/derive';
import { useAuth } from '../auth/AuthProvider';
import { primeLayoutInset, setLayoutInset, useIsPhone, useViewportQuery } from '../lib/useMediaQuery';
import { AREAS, areaOf, pageOf, pagesOf, titleOf } from './nav';
import { SiteMap } from './SiteMap';
import { Notifications } from './Notifications';
import { GlobalSearch } from './GlobalSearch';
import { MarketTape } from './MarketTape';
import { tickClass, useTick } from '../lib/useTick';
import { ChatLive } from '../chat/ChatLive';
import { useWhatsNew, WhatsNewDialog } from '../whatsnew/WhatsNew';
import { CHAT_SIDEBAR_ID, ChatSidebar } from '../chat/ChatSidebar';
import {
  CHAT_SIDEBAR_MIN_VIEWPORT,
  CHAT_SIDEBAR_WIDTH,
  isChatShortcut,
  setChatSidebarOpen,
  sidebarDocks,
  useChatSidebarOpen,
} from '../chat/sidebarState';
import { incomingNotice, titleWithUnread } from '../chat/unread';
import './AppShell.css';
import './layout.css';

export function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isPhone = useIsPhone();
  const { logout } = useAuth();
  const me = useMe();
  const portfolio = usePortfolio();
  const book = portfolio.data ? bookValue(portfolio.data) : undefined;
  // Phone: „Mehr“ and the page title in the header open the same sheet with every page.
  const [moreOpen, setMoreOpen] = useState(false);
  const valueTick = useTick(book);
  const unread = useChatUnread().messages;
  const badges: Record<string, number | undefined> = { community: unread || undefined, '/nachrichten': unread || undefined };

  const current = areaOf(pathname);
  // The bottom tabs return to the page last opened in their area (Markt → Zentralbank stays Zentralbank).
  const page = pageOf(pathname);
  const inArea = !!current && !!page && !!AREAS.find((a) => a.value === current && pagesOf(a).some((p) => p.href === page.href));
  const visited = inArea && current && page ? { [current]: page.href } : undefined;
  const lastPage: Record<string, string> = { ...readLastPages(), ...visited };
  const visitedKey = JSON.stringify(visited);
  useEffect(() => {
    if (!visitedKey) return;
    try {
      sessionStorage.setItem(LAST_PAGE_KEY, JSON.stringify({ ...readLastPages(), ...JSON.parse(visitedKey) }));
    } catch {
      /* private mode */
    }
  }, [visitedKey]);
  // Securities pages on the phone bring their own top bar and the TradeBar – no second bar at the bottom.
  const bare = isPhone && pathname.startsWith('/wertpapier/');

  // Chat sidebar: docked right on wide screens, never on the chat page itself. Pages size their layout by
  // the viewport – the inset shifts their width queries by the sidebar (see useMediaQuery).
  const wide = useViewportQuery(`(min-width: ${CHAT_SIDEBAR_MIN_VIEWPORT}px)`);
  const sidebarOpen = useChatSidebarOpen();
  const canDock = sidebarDocks(pathname, wide);
  const docked = canDock && sidebarOpen;
  const [sidebarChat, setSidebarChat] = useState<string>();
  primeLayoutInset(docked ? CHAT_SIDEBAR_WIDTH : 0);
  useLayoutEffect(() => setLayoutInset(docked ? CHAT_SIDEBAR_WIDTH : 0), [docked]);
  const onChatPage = pathname === '/nachrichten' || pathname.startsWith('/nachrichten/');
  const toggleChat = useCallback(() => {
    if (canDock) setChatSidebarOpen(!sidebarOpen);
    else if (!onChatPage) navigate('/nachrichten');
  }, [canDock, sidebarOpen, onChatPage, navigate]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (canDock && isChatShortcut(e)) {
        e.preventDefault();
        setChatSidebarOpen(!sidebarOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canDock, sidebarOpen]);

  // „(3) Wertpapiere · Alpha-Trader“ in the browser tab: unread count, page name.
  const pageTitle = titleOf(pathname);
  useEffect(() => {
    document.title = titleWithUnread(`${pageTitle} · Alpha-Trader`, unread);
  }, [pageTitle, unread]);

  // A notice for a new message – unless it is on screen already (chat page, open sidebar).
  const [notice, setNotice] = useState<{ chatId: string; title: string; text: string; key: string }>();
  const onFresh = (chat: ChatView, m: MessageView) => {
    if (onChatPage || docked) return;
    setNotice({ chatId: chat.id, key: m.id ?? String(m.dateSent), ...incomingNotice(chat, m) });
  };
  const openNotice = () => {
    if (!notice) return;
    if (canDock) {
      setSidebarChat(notice.chatId);
      setChatSidebarOpen(true);
    } else navigate(`/nachrichten/${notice.chatId}`);
    setNotice(undefined);
  };

  // The active area's tab carries the name of the open page („Geldflüsse ▾“) – pages have no big
  // title of their own any more (screen readers only), the tab says where you are.
  const items = AREAS.map((a) => ({
    label: a.value === current ? pageTitle : a.label,
    href: a.href,
    active: a.value === current,
    badge: badges[a.value],
    children: a.children?.map((c) => ({ ...c, active: pathname === c.href || pathname.startsWith(c.href + '/'), badge: badges[c.href] })),
  }));

  // Placeholders of the same size while the portfolio loads – otherwise search and nav jump sideways.
  const pending = <DS.Skeleton width="14ch" />;
  const stats = [
    <span key="d" className={`tick${tickClass(valueTick)}`}>
      <DS.HeaderStat label="Depotwert" value={book ?? pending} />
    </span>,
    <span key="b" className="shell__cash">
      <DS.HeaderStat label="Bargeld" value={portfolio.data?.cash ?? pending} />
    </span>,
  ];

  const chatButton = (
    <DS.NotificationBell
      icon="chat"
      label="Nachrichten"
      count={unread}
      pressed={canDock ? docked : undefined}
      controls={docked ? CHAT_SIDEBAR_ID : undefined}
      title={canDock ? (docked ? 'Chat ausblenden (C)' : 'Chat einblenden (C)') : 'Nachrichten'}
      onClick={toggleChat}
    />
  );

  // „Neu bei Alpha-Trader“: opens by itself once something is unseen, or from the player menu.
  const whatsNew = useWhatsNew();
  const [newsManual, setNewsManual] = useState(false);
  const [newsDismissed, setNewsDismissed] = useState(false);
  const newsMode = newsManual ? 'all' : whatsNew.ready && whatsNew.auto && whatsNew.count > 0 && !newsDismissed ? 'new' : null;

  const menu = (
    <DS.PlayerMenu
      key="p"
      name={me.data?.username ?? '…'}
      items={[
        { label: 'Neuigkeiten', onClick: () => setNewsManual(true), badge: whatsNew.count || undefined },
        { label: 'Einstellungen', href: '/einstellungen' },
        { divider: true },
        { label: 'Impressum', href: '/impressum' },
        { label: 'Datenschutz', href: '/datenschutz' },
        { divider: true },
        { label: 'Abmelden', onClick: logout },
      ]}
      onNavigate={(item, e) => {
        if (item.href) {
          e.preventDefault();
          navigate(item.href);
        }
      }}
    />
  );

  const bottomNav = {
    'aria-label': 'Bereiche',
    value: moreOpen ? 'mehr' : current,
    items: [
      ...AREAS.filter((a) => a.value !== 'highscores').map((a) => ({
        value: a.value,
        label: a.label,
        icon: a.icon,
        href: lastPage[a.value] ?? a.href ?? a.children?.[0].href,
        badge: badges[a.value],
      })),
      { value: 'mehr', label: 'Mehr', icon: 'menue' as const },
    ],
    onChange: (value: string, e: React.MouseEvent) => {
      e.preventDefault();
      if (value === 'mehr') return setMoreOpen(true);
      const a = AREAS.find((x) => x.value === value);
      // Tapping the active tab again shows the area's other pages.
      if (a && value === current && pagesOf(a).length > 1) return setMoreOpen(true);
      const href = lastPage[value] ?? a?.href ?? a?.children?.[0].href;
      if (href) navigate(href);
    },
  };

  return (
    <div className={`shell${bare ? ' shell--bare' : ''}${isPhone && !bare ? ' shell--tabbar' : ''}${docked ? ' shell--chat' : ''}`}>
      {!bare && (
        <DS.AppHeader
          brand={
            isPhone ? (
              <button type="button" className="shell__title" aria-haspopup="dialog" onClick={() => setMoreOpen(true)}>
                <span>{titleOf(pathname)}</span>
                <span className="bnk-chev" aria-hidden="true" />
              </button>
            ) : (
              'Alpha-Trader'
            )
          }
          brandHref={isPhone ? undefined : '/'}
          items={items}
          className="shell__header"
          meta={[
            ...(isPhone ? [] : [<GlobalSearch key="s" />]),
            ...stats,
            <span key="n" className="shell__icons">
              {chatButton}
              <Notifications />
            </span>,
            menu,
          ]}
          bottomNav={bottomNav}
          renderLink={(item, { key, ...props }, children) => (
            <Link key={key} to={item.href ?? '/'} {...props}>
              {children}
            </Link>
          )}
        />
      )}
      {!bare && !isPhone && <MarketTape />}
      <main className="shell__main">
        <Outlet />
      </main>
      {docked && <ChatSidebar chatId={sidebarChat} onChatId={setSidebarChat} onClose={() => setChatSidebarOpen(false)} />}
      {newsMode && (
        <WhatsNewDialog
          mode={newsMode}
          engine={whatsNew.engine}
          fresh={whatsNew.fresh}
          onClose={(shown) => {
            whatsNew.markSeen(shown);
            setNewsManual(false);
            setNewsDismissed(true);
          }}
        />
      )}
      {me.data?.username && <ChatLive me={me.data.username} onFresh={onFresh} />}
      {notice && (
        <DS.ToastRegion>
          <DS.Toast
            key={notice.key}
            title={notice.title}
            duration={8000}
            onClose={() => setNotice(undefined)}
            action={
              <DS.Button variant="ghost" size="sm" onClick={openNotice}>
                Öffnen
              </DS.Button>
            }
          >
            {notice.text}
          </DS.Toast>
        </DS.ToastRegion>
      )}
      <DS.Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Alle Seiten">
        <SiteMap
          pathname={pathname}
          current={current}
          badges={badges}
          onPick={() => setMoreOpen(false)}
          footer={
            <li>
              <button type="button" onClick={logout}>
                <span className="sitemap__label">Abmelden</span>
              </button>
            </li>
          }
        />
        <DS.AppFooter note="Inoffizielle Oberfläche für Alpha-Trader – kein Angebot der Betreiber." />
      </DS.Sheet>
    </div>
  );
}

const LAST_PAGE_KEY = 'at.lastPage';

function readLastPages(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(LAST_PAGE_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}
