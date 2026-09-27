Liste aus Bezeichnung und Wert mit Haarlinien und optionaler Summenzeile; für Order-Übersichten und Kennzahlen eines Wertpapiers. Beträge ab 1 Mrd. werden gekürzt (`compact`).

## Aufbau

- Links die Bezeichnung in `text-secondary`, rechts der Wert in `text-primary`. Zahlen (`value` als Zahl) werden automatisch als Betrag in Monospace gesetzt („2.425,00 €“), mit `unit` als Stückzahl („50 Stk.“).
- Zwischen den Zeilen Haarlinien in `line`.
- `muted`: Wert in `text-secondary`, z. B. Bargeld danach.
- `total`: Summenzeile unter einer 1px-Linie in `line-strong`, Bezeichnung in Versalien, Wert 18px.

## Verwendung

```jsx
const { SummaryList } = window.Bankiersgruen;

<SummaryList items={[
  { label: 'Stückzahl', value: 50, unit: 'Stk.', decimals: 0 },
  { label: 'Order-Typ', value: 'Limit 48,50 €' },
  { label: 'Kurswert', value: 2425.00 },
  { label: 'Bargeld danach', value: 973617.48, muted: true },
  { label: 'Gesamt', value: 2429.90, total: true },
]} />
```

## Barrierefreiheit

- Echte Beschreibungsliste (`<dl>`, `<dt>`, `<dd>`).
- Bezeichnungen 6,1:1, Werte 11,8:1 auf `bg-card`.
