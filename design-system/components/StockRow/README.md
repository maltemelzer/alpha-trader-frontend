Eine Zeile pro Aktie mit Name, Ticker, Kurs und Kursveränderung; für Watchlist, Depot und Marktlisten in einer Karte mit `flush`.

## Aufbau

| Spalte | Inhalt | Stil |
| --- | --- | --- |
| Name | Aktienname, darunter Ticker und optional `meta` (z. B. „12 Stk. · Ø 41,20 €“) | `stock-name` / `label` in `text-secondary` |
| Kurs | aktueller Kurs | `figure`, rechtsbündig |
| … oder Positionswert | mit `value` (Depot-Ansicht): Positionswert, darunter klein „Kurs 48,72 €“ | `figure` / 12px `text-secondary` |
| Verlauf (optional) | mit `spark`: `Sparkline` 64 × 22px zwischen Name und Kurs | Farbe nach Richtung |
| Veränderung | `PriceChange` als Kurszettel | `change`, rechtsbündig |

Zahlen stehen in Monospace mit Tabellenziffern, damit Kommas untereinander stehen. Lange Namen werden mit „…“ gekürzt. Die Zeile hat drei Spalten (mit Sparkline vier) und passt so auch in schmale Karten. Die Veränderung sollte denselben Zeitraum haben wie die Sparkline.

## Varianten

- **Statisch:** Standard.
- **Klickbar:** mit `href` (Link zur Aktienseite) oder `onClick`. Die ganze Zeile hellt beim Hover auf (`bg-raised`), Fokus-Ring in `brass` innen.

## Regeln

1. **Immer in einer Liste:** `<Card flush><ul className="bnk-list">…</ul></Card>`. Zwischen den Zeilen stehen Haarlinien (Regel 6), keine Einzelkarten.
2. **Veränderung als Kurszettel**, nie als Etikett (siehe `PriceChange`).
3. **Keine Buttons in klickbaren Zeilen.** Aktionen wie „Kaufen“ gehören auf die Aktienseite oder in ein Menü.
4. **Spaltenköpfe** bei mehr als drei Zeilen: eine Zeile in `label` (z. B. „Titel · Wert · Heute“), rechtsbündig über den Zahlen.

## Verwendung

```jsx
const { Card, StockRow } = window.Bankiersgruen;

<Card title="Watchlist" flush>
  <ul className="bnk-list">
    <StockRow name="Hanse Reederei AG" ticker="HRD" price={48.72} change={2.34} href="/aktie/hrd" />
    <StockRow name="Nordbank Holding" ticker="NBH" price={116.85} change={-0.62} />
  </ul>
</Card>

// Mit Mini-Kursverlauf (30 Tage)
<StockRow name="Hanse Reederei AG" ticker="HRD" price={48.72} change={10.4} spark={kurse30Tage} />

// Depot-Ansicht mit Positionswert
<StockRow name="Hanse Reederei AG" ticker="HRD" meta="120 Stk." value={5846.40} price={48.72} change={2.34} />
```

## Barrierefreiheit

- Name 11,8:1, Ticker 6,1:1 auf `bg-card`; auf Hover (`bg-raised`) 10,1:1 und 5,2:1.
- Die Veränderung wird vorgelesen („gestiegen um 2,34 Prozent“).
- Der Aufrufer liefert: Kurs und Veränderung als Zahlen, bei klickbaren Zeilen das Ziel (`href`).
