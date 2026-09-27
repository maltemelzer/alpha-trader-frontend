Auswahlfeld im Stil der Eingabefelder für 4 und mehr Optionen, etwa Portfolio, Wertpapierart oder Highscore-Kategorie; nutzt die native Auswahl des Browsers.

## Aufbau

Wie `Input`: Label in Versalien, eingelassene Fläche `bg-page`, Rahmen `line-control`, Pfeil ▾ rechts in `text-secondary`. Hinweis und Fehler darunter. Mit `placeholder` („Portfolio wählen“) steht der Platzhalter gedämpft in `text-muted`, bis etwas gewählt ist.

## Wann Select, wann SegmentedControl?

| Optionen | Komponente |
| --- | --- |
| 2 bis 4, alle sollen sichtbar sein | `SegmentedControl` (z. B. Kaufen/Verkaufen, Order-Typ) |
| 4 und mehr, oder lange Namen | `Select` (z. B. Portfolio, Wertpapierart, Highscore-Kategorie) |

## Verwendung

```jsx
const { Select } = window.Bankiersgruen;

<Select label="Portfolio" defaultValue="p"
        options={[{ value: 'p', label: 'Mein Portfolio (privat)' }, { value: 'c1', label: 'Hanse Beteiligungs AG' }]} />
<Select label="Depot" placeholder="Depot wählen" options={depots} error="Bitte ein Depot wählen." />
```

## Barrierefreiheit

- Natives `<select>`: Tastatur, Screenreader und mobile Auswahllisten funktionieren ohne Zusatzaufwand.
- Zustände, Kontraste und offene Punkte wie bei `Input`.
- Der Aufrufer liefert: `label` und die Optionen.
