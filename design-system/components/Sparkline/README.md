Mini-Kursverlauf ohne Achsen und Beschriftung, als schlanke Linie; für Watchlist, Tabellen und Kennzahlen – zeigt die Form, die Zahl steht daneben.

## Aufbau

- SVG-Linie 1,5px, runde Ecken, keine Fläche darunter, kein Verlauf (Regel 7). Am letzten Kurs ein kleiner Punkt.
- **Farbe nach Richtung im Zeitraum:** steigend `gain`, fallend `loss`, unverändert `text-secondary`. Im Farbenblind-Modus automatisch Blau/Orange.
- **Bezugslinie** (`baseline`), z. B. Vortagesschluss: gestrichelt in `line-strong`. Die Richtung wird dann gegen diesen Wert bestimmt – wie in jeder Kursliste.
- `variant="neutral"`: immer `text-secondary`, für Verläufe ohne Wertung (Indizes im Hintergrund, Volumen).
- Größen frei, üblich: 64 × 22px in Listen und Tabellen, 80 × 24px Standard, 120 × 32px in Kennzahl-Kacheln.

## Einsatz

| Ort | So |
| --- | --- |
| `StockRow` | `spark={kurse}` – Spalte zwischen Name und Kurs |
| `DataTable` | Spalte mit `type: 'sparkline'`, Schlüssel liefert die Zahlenreihe; sortiert nach Veränderung im Zeitraum |
| Kennzahl-Kachel | als Verlauf unter dem Wert (kommt mit der Kachel) |

## Regeln

1. **Nie allein.** Eine Sparkline steht immer neben einer `PriceChange` für denselben Zeitraum, sonst fehlen Pfeil und Vorzeichen (Regel 3).
2. **Zeitraum nennen**, im Spaltenkopf oder der Rubrik: „30 Tage“, „Heute“.
3. **Keine Achsen, keine Tooltips.** Wer Details will, klickt auf die Aktie und sieht den `Kursverlauf` mit Plotly.
4. **Eine Linie pro Sparkline.** Vergleiche mehrerer Werte gehören in ein richtiges Diagramm.
5. **Bewusst ohne Plotly:** Eine Sparkline ist ein kleines SVG ohne Bibliothek, damit Listen mit 50 Zeilen schnell bleiben.

## Verwendung

```jsx
const { Sparkline, StockRow, PriceChange } = window.Bankiersgruen;

<Sparkline data={kurse30Tage} />
<Sparkline data={kurseHeute} baseline={vortagesschluss} width={120} height={32} />

<StockRow name="Hanse Reederei AG" ticker="HRD" price={48.72} change={10.4} spark={kurse30Tage} />

// DataTable-Spalte
{ key: 'spark', label: '30 T.', type: 'sparkline' }
```

## Barrierefreiheit

- `role="img"` mit Beschreibung, z. B. „Kursverlauf: von 44,00 € auf 48,72 €, plus 10,73 Prozent“ – mit `label` statt „Kursverlauf“ der Aktienname.
- Linienfarben gegen `bg-card`: `gain` 8,3:1, `loss` 5,4:1, `text-secondary` 6,1:1.
- Der Aufrufer liefert: die Kursreihe (älteste zuerst) und für Tagesverläufe den Vortagesschluss.
