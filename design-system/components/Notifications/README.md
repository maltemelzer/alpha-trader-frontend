Glocke im Kopf mit Zahl ungelesener Meldungen (`NotificationBell`) und die Liste dazu (`NotificationList`): ausgeführte Orders, neue Abstimmungen, Antworten, Dividenden.

## Aufbau

- **Glocke:** 36 px, Linien-Symbol in `text-secondary`. Zahl als kleines Schild in `text-primary`, ab 100 „99+“. Kein Rot – ungelesen ist keine Warnung, und Rot gehört Verlusten und Fehlern.
- **Andere Zähler im Kopf:** Mit `icon` und `label` wird dieselbe Schaltfläche z. B. zum Chat-Knopf (`icon="chat" label="Nachrichten"`) – gleiche Größe, gleiches Schild, direkt neben der Glocke. Schaltet sie einen Bereich ein und aus (Chat-Seitenleiste), `pressed` und `controls` setzen; `title` nennt das Tastenkürzel.
- **Liste:** Serif-Titel mit Messing-Linie, „Alle gelesen“ als Ghost-Knopf. Ungelesen: Punkt links und halbfetter Betreff; gelesen: Betreff in `text-secondary`. Darunter zwei Zeilen Text und Zeit in Monospace („24.9.2026, 07:44“).
- ✕ zum Löschen erscheint bei Hover/Fokus, auf Touch immer.
- Leer: `EmptyState` kompakt.

## Regeln

1. Öffnen einer Meldung markiert sie als gelesen und führt zum Ziel (Order, Abstimmung, Beitrag).
2. Am Desktop als Ausklapper unter der Glocke, am Handy als `Sheet`.
3. Zahlen im Text nach den Zahlenregeln („1,24 Mio. €“); Kursrichtungen nur mit ▲/▼ und Gewinn-/Verlustfarbe, wenn es wirklich um Kurse geht.

## API

| Zweck | Endpunkt |
| --- | --- |
| Liste | `GET /api/v2/notifications?page&size&isRead&search` → Seite mit `NotificationView` |
| Zahl an der Glocke | `GET /api/v2/notifications/unread/count` → Zahl |
| Eine als gelesen/ungelesen | `PUT /api/v2/notifications/{id}?isRead=true` |
| Alle gelesen | `PUT /api/v2/notifications?isRead=true` (optional `notificationIds[]`) |
| Löschen | `DELETE /api/v2/notifications/{id}`, mehrere: `DELETE /api/v2/notifications?notificationIds[]` |
| `subject`, `content` | Message-Objekt; angezeigt wird `filledString` |
| `date` | Epoch-ms |

## Verwendung

```jsx
const { NotificationBell, NotificationList, Sheet } = window.Bankiersgruen;
<NotificationBell count={unread} expanded={open} haspopup onClick={() => setOpen(!open)} />
<NotificationBell icon="chat" label="Nachrichten" count={unreadMessages} pressed={sidebarOpen} controls="chat-sidebar" onClick={toggleSidebar} />
<NotificationList items={notifications} onOpen={openNote} onReadAll={markAll} onDelete={remove} />
```

## Barrierefreiheit

- Glocke: `aria-label` mit Anzahl („Benachrichtigungen, 2 ungelesen“ bzw. „Nachrichten, 3 ungelesen“), `aria-expanded` für den Ausklapper, `aria-pressed` für Umschalter.
- Ungelesene Einträge haben den unsichtbaren Zusatz „(ungelesen)“; die Zeit ist ein `<time datetime>`.
