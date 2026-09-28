Bilanz eines Unternehmens wie im Geschäftsbericht: Aktiva links, Passiva rechts, Summen unter einer kräftigen Linie, Stichtag wählbar.

## Aufbau

- Kopf: Zeitraum in Mono, rechts `Select` „Stichtag“ (nur wenn es mehrere Bilanzen gibt).
- Zwei Spalten mit Serif-Überschrift „Aktiva“ / „Passiva“, getrennt durch eine Haarlinie. Jede Zeile: Posten, Betrag (Kurzform ab 1 Mio.), Anteil an der Summe in %.
- **Aktiva:** Bargeld · Aktien · Anleihen · Immobilien · Sonstige Vermögenswerte · Zentralbankreserven · Sicherheiten für Optionsscheine.
- **Passiva:** Begebene Anleihen · Rückkaufverpflichtungen · Begebene Optionsscheine · Eigenkapital (hervorgehoben).
- Posten ohne Wert (`null`) fallen weg, 0 bleibt stehen.
- Fuß: **Periodenergebnis** als `SignedAmount`.
- Unter 640 px untereinander.

## Regeln

1. **Keine Gewinn-/Verlustfarbe** – auch nicht für das Periodenergebnis. Es ist ein Bilanzwert, keine Kursbewegung (Regel 2); das Vorzeichen reicht.
2. Summe Aktiva = Summe Passiva; wenn nicht, trotzdem beide zeigen (nicht korrigieren).

## API

- `GET /api/v2/companies/{companyId}/balancesheets` → Liste (Felder siehe `BalanceSheetView` in `index.d.ts`, gelesen aus `balancesheet.js` des Spiels; im Spec untypisiert).

## Verwendung

```jsx
<Card title="Bilanz"><BalanceSheet sheets={sheets} /></Card>
```
