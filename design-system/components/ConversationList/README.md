Die Unterhaltungsliste zeigt alle Chats in Abschnitten – Direkt, Gruppen, Öffentlich – als Zeilen mit Haarlinien.

## Aufbau

- **Abschnitt:** Überschrift in `label` (Versalien, `text-secondary`).
- **Zeile:** Kennzeichen links, Name in der Serifenschrift, Vorschau in `text-secondary` einzeilig gekürzt, rechts Zeit und Zähler. Haarlinie in `line` dazwischen (Regel 6).
- **Kennzeichen:** Direktnachricht = Kreis mit Kürzel (`radius-pill` nur für Kreise); Gruppe = eckiges Feld `radius-md` mit „#“ oder Kürzel; öffentliche Lobby (`kind: 'public'`) = eckiges Feld mit „№“. Zuordnung zur API: `groupChat` → group, `publicChat` → public, sonst direct.
- **Online:** kleiner Punkt in `text-primary` am Kreis, nicht grün (Regel 2).
- **Ungelesen:** Name fett, Zähler in Mono, umgekehrt: `bg-page` auf `text-primary`. Kein Messing, keine Signalfarbe.
- **Aktiv:** Fläche `bg-raised` und 2px-Messingbalken links (wie der aktive Tab).

## Regeln

1. **Keine Farben für Status.** Online, ungelesen, stummgeschaltet werden über Form und Gewicht gezeigt.
2. **Vorschau eigener Nachrichten** beginnt mit „Du:“, in Gruppen mit dem Vornamen des Absenders.
3. **Sortierung** innerhalb eines Abschnitts nach letzter Nachricht; die Lobbys stehen immer unten.

## Verwendung

```jsx
const { ConversationList } = window.Bankiersgruen;

<ConversationList onSelect={c => open(c.id)} groups={[
  { label: 'Direkt', items: [{ id: 'f', name: 'Frieda Kontor', preview: 'Hast du …', time: '17:12', unread: 2, online: true }] },
  { label: 'Gruppen', items: [{ id: 'l', kind: 'group', name: 'Hanseatische Allianz', initials: 'HA', active: true }] },
  { label: 'Öffentlich', items: [{ id: 'm', kind: 'public', name: 'Lobby (de)', preview: 'abimbola has joined' }] }
]} />
```

## Barrierefreiheit

- Jede Zeile ist ein Button (oder Link mit `href`); die aktive trägt `aria-current="true"`.
- Online-Punkt und Zähler haben eigene Labels („online“, „2 ungelesen“), die mit dem Namen vorgelesen werden.
- Die Abschnitte sind Listen mit Überschrift.
