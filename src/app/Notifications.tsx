import { useState } from 'react';
import { DS } from '../ds';
import { useNotificationActions, useNotifications, useUnreadNotifications } from '../api/queries';
import { translate } from '../lib/messages';

/** Bell in the header; opens the notification list in a sheet (right on desktop, bottom on phones). */
export function Notifications() {
  const [open, setOpen] = useState(false);
  const unread = useUnreadNotifications();
  const list = useNotifications(open);
  const { read, readAll, remove } = useNotificationActions();

  const items = (list.data?.content ?? []).map((n) => ({
    id: n.id,
    subject: translate(n.subject),
    content: translate(n.content),
    date: n.date,
    readByReceiver: n.readByReceiver,
  }));

  return (
    <>
      <DS.NotificationBell count={unread.data ?? 0} expanded={open} haspopup onClick={() => setOpen((o) => !o)} />
      <DS.Sheet open={open} onClose={() => setOpen(false)} title="Benachrichtigungen" side="auto" width={420}>
        {list.isLoading ? (
          <DS.Loading rows={6} />
        ) : items.length ? (
          <DS.NotificationList
            title=""
            items={items}
            onOpen={(n) => !n.readByReceiver && read.mutate(n.id)}
            onReadAll={unread.data ? () => readAll.mutate() : undefined}
            onDelete={(n) => remove.mutate(n.id)}
          />
        ) : (
          <DS.EmptyState compact as="h3" title="Keine Benachrichtigungen">
            Ausgeführte Orders, Abstimmungen und Antworten erscheinen hier.
          </DS.EmptyState>
        )}
      </DS.Sheet>
    </>
  );
}
