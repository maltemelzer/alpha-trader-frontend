Die Startseite des Forums: alle Bereiche untereinander, mit Beschreibung, Zahl der Themen und Beiträge und dem letzten Beitrag.

## Aufbau
- Kopfzeile in `label` (Versalien) über einer 1px-Linie in `line-strong`, Zeilen durch Haarlinien getrennt (Regel 6).
- Links ein eckiges Feld mit dem Anfangsbuchstaben (wie Gruppen im Chat), dann Name in der Serifenschrift (17px) und Beschreibung in `text-secondary`.
- Zahlen rechtsbündig in Mono. Letzter Beitrag: Titel einzeilig gekürzt, darunter Autor und Zeit.
- **Neu:** Punkt und „12 neu“ in `text-primary`, Feldrahmen hell. Keine Signalfarbe, kein Messing.
- Unter 640px Breite (Container-Abfrage): Zahlen wandern in eine Zeile unter die Beschreibung, der letzte Beitrag entfällt.

## Regeln
1. Höchstens etwa 8 Bereiche. Mehr gehört in Unterbereiche oder Schlagworte.
2. Die Liste steht in einer Karte (`bg-card`), nicht jeder Bereich in einer eigenen Karte.
3. „Neues Thema“ als Messing-Button im Seitenkopf – nur einmal pro Bildschirm.

## Verwendung
```jsx
const { ForumCategoryList, PageHeader, Button } = window.Bankiersgruen;

<PageHeader title="Forum" size="md" actions={<Button variant="primary">Neues Thema</Button>} />
<ForumCategoryList categories={[
  { id: 'aktien', name: 'Aktien im Gespräch', description: 'Ein Thema pro Aktie.', threads: 642, posts: 9310, unread: true,
    href: '/forum/aktien', last: { title: 'Hanse Reederei – nach den Zahlen', author: 'Frieda Kontor', time: '17:42', href: '/t/381' } }
]} />
```

## Barrierefreiheit
- Der Name ist ein Link (`href`) oder ein Knopf (`onSelect`). Zahlen tragen unsichtbare Beschriftungen („Themen: 642“).
- Die Kopfzeile ist nur optisch (`aria-hidden`), die Beschriftung steckt in jeder Zeile.
