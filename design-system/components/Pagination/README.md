Seitenwechsel für Themenlisten und Themen: Zurück, Seitenzahlen mit Auslassung, Weiter. Die aktuelle Seite trägt die Messing-Linie wie ein aktiver Reiter.

## Aufbau
- Zahlen in Mono, 32px hohe Klickflächen, Hover `bg-raised`.
- Aktuelle Seite: `text-primary` und 2px-Linie in `brass` darunter – keine gefüllte Fläche (Regel 1 bleibt für die Hauptaktion).
- Bis 7 Seiten alle Zahlen, darüber: erste, letzte, die aktuelle mit Nachbarn und „…“.
- Zurück/Weiter mit CSS-Winkel (`.bnk-chev`), am Anfang/Ende gedämpft in `text-disabled`. Unter 480px nur die Winkel.
- Optional rechts die Gesamtzahl („642 Themen“).

## Verwendung
```jsx
const { Pagination } = window.Bankiersgruen;

<Pagination page={page} pages={48} onChange={setPage} total="1.284 Themen" />
<Pagination page={3} pages={12} hrefFor={p => `/forum/aktien?seite=${p}`} />
```

## Barrierefreiheit
- `nav` mit Namen „Seiten“, aktuelle Seite mit `aria-current="page"`, Zahlen lesen sich „Seite 3“.
- Mit `hrefFor` echte Links (Zurück-Taste und neue Tabs funktionieren), sonst Knöpfe.
