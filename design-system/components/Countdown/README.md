Restzeit bis zu einem Zeitpunkt: Ende einer Zeichnungsfrist, Gültigkeit einer Order (`goodTillDate`), nächste stündliche Limit-Änderung (`nextHourlyChangeDate`), Ablauf einer Abstimmung.

## Varianten
- `inline`: Label in Versalien, Zeit in Mono, z. B. „ZEICHNUNGSFRIST 2 T 04:12:33“. Mit `short` nur „2 T 4 h“ bzw. „1:24 h“ – für Listen.
- `tile`: großer Wert (Mono 28px) mit Label und Hinweis, z. B. dem genauen Datum.
- Nach Ablauf `endedText` (Standard „Beendet“) in `text-secondary` und einmal `onEnd`.

## Regeln
1. Die Börse handelt rund um die Uhr – es gibt keinen Börsenschluss-Countdown.
2. Kein Rot, wenn die Zeit knapp wird. Wichtiges gehört in einen `Banner`.
3. Sekunden nur, wenn sie für die Entscheidung zählen (Zeichnungsfrist, Abstimmung); sonst `short`.

## Verwendung
```jsx
const { Countdown } = window.Bankiersgruen;

<Countdown label="Zeichnungsfrist" to={capitalIncrease.endDate} />
<Countdown label="Order gültig" to={order.goodTillDate} short />
<Countdown variant="tile" label="Kapitalerhöhung endet" to={endDate} hint="So., 27. September, 14:00 Uhr" onEnd={reload} />
```

## Barrierefreiheit
- `role="timer"` (wird nicht laufend vorgelesen) mit ausgeschriebener Restzeit als Name („Zeichnungsfrist: noch 2 Tage, 4 Stunden“).
