Reiter wechseln zwischen Ansichten derselben Seite, etwa Übersicht, Chart, Kennzahlen und Nachrichten einer Aktie; der aktive Reiter trägt die Messing-Linie.

## Aufbau

- Reihe von Reitern auf einer 1px-Linie in `line-strong`. Aktiv: `text-primary` mit 2px-Linie in `brass`, die auf der Grundlinie aufliegt. Inaktiv: `text-secondary`, beim Hover `text-primary`.
- Optionaler Zähler (`count`) in `bg-raised`, z. B. Anzahl neuer Nachrichten.
- Größen: `md` 44px (Seiten-Reiter), `sm` 36px (in Karten, z. B. „Gewinner · Verlierer“).
- Bei vielen Reitern scrollt die Reihe waagerecht, statt umzubrechen.

## Tabs, SegmentedControl oder Navigation?

| Fall | Komponente |
| --- | --- |
| Andere Seite im Spiel (Markt, Depot, Rangliste) | `AppHeader` |
| Andere Ansicht **auf derselben Seite**, eigener Inhalt je Reiter | `Tabs` |
| Filter oder Einstellung, die dieselbe Ansicht verändert (Zeitraum 1T/1W, Kaufen/Verkaufen) | `SegmentedControl` |

## Regeln

1. **2 bis 6 Reiter**, kurze Substantive.
2. **Der erste Reiter ist der wichtigste** und standardmäßig gewählt.
3. **Nicht verfügbare Reiter** (`disabled`) nur zeigen, wenn klar ist, warum – sonst weglassen.
4. **Keine Gewinn-/Verlustfarben** in Reitern, auch nicht bei „Gewinner/Verlierer“: die Farbe steht in der Liste darunter.

## Verwendung

```jsx
const { Tabs } = window.Bankiersgruen;

<Tabs aria-label="Aktie" defaultValue="overview" items={[
  { value: 'overview', label: 'Übersicht', content: <Overview /> },
  { value: 'chart', label: 'Chart', content: <PriceChart /> },
  { value: 'news', label: 'Nachrichten', count: 4, content: <News /> },
]} />

// Nur die Reiter, Inhalt selbst rendern:
<Tabs items={[{ value: 'top', label: 'Gewinner' }, { value: 'flop', label: 'Verlierer' }]} value={tab} onChange={setTab} />
```

## Barrierefreiheit

- Muster „Tabs“: `role="tablist"`, `tab`, `tabpanel`; `aria-selected` und `aria-controls` werden gesetzt.
- Tastatur: Tab springt auf den aktiven Reiter, Pfeiltasten links/rechts wechseln, Pos1/Ende springen an den Anfang/das Ende; deaktivierte Reiter werden übersprungen.
- Text 7,0:1 (inaktiv) bzw. 13,7:1 (aktiv) auf `bg-page`; Fokus-Ring in `brass`.
- Der Aufrufer liefert: `aria-label` für die Reiterleiste und die Reiter.
