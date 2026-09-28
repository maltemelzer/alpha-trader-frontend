Kennzahl mit Label, großem Wert, Veränderung und optional Sparkline; mehrere Kennzahlen stehen in einer `StatGroup` nebeneinander, getrennt durch Haarlinien.

## Aufbau

- **Label** in Versalien (`text-secondary`).
- **Wert** in Monospace: 20px, als Hauptkennzahl (`lead`) 28px. Zahlen werden automatisch formatiert („124.380,50 €“, „12.400 Pkt.“). Mit `signed` bekommt ein Gewinn- oder Verlustbetrag sein Vorzeichen; die **Farbe** kommt aber nur von der Veränderung daneben.
- **Veränderung** als `PriceChange`: bei der Hauptkennzahl als Etikett, sonst als Kurszettel (Regel 4).
- **Sparkline** darunter (Hauptkennzahl 200 × 40px, sonst 120 × 28px), gleicher Zeitraum wie die Veränderung.
- **Hinweis** darunter, z. B. „Stand 17:35 Uhr“ oder „Upgrade auf 1,48 Coins/h für 29.193,29 €“.

## StatGroup – die Kennzahlenleiste

- Kacheln in einer Reihe, dazwischen senkrechte Haarlinien, in einer `Card` mit `flush` – wie der Kennzahlenkasten im Wirtschaftsteil.
- Breiten über `columns`, z. B. `"2fr 1fr 1fr 1fr"`: die Hauptkennzahl bekommt mehr Platz.
- Wird die Leiste schmaler als 560px, stehen die Kacheln untereinander, getrennt durch waagerechte Haarlinien.

## Regeln

1. **Höchstens eine Hauptkennzahl (`lead`) pro Bereich**, und nur sie trägt ein Etikett.
2. **Höchstens 4 Kacheln pro Leiste.** Mehr gehört in eine `SummaryList` oder Tabelle.
3. **Der Wert selbst bleibt `text-primary`.** Gewinn/Verlust-Farbe nur über die Veränderung (Regel 2).
4. **Keine Kacheln ohne Aussage:** Jede Kennzahl sagt, worauf sie sich bezieht (Zeitraum, Stand, Ziel).

## Verwendung

```jsx
const { Card, StatGroup, StatTile } = window.Bankiersgruen;

<Card flush>
  <StatGroup columns="2fr 1fr 1fr 1fr">
    <StatTile lead label="Depotwert" value={124380.5} change={1.84} changeSuffix="heute" spark={depotverlauf} hint="Stand 17:35 Uhr" />
    <StatTile label="Gewinn heute" value={2246.10} signed change={1.84} />
    <StatTile label="Buchwert" value={69058819264881.92} />   // zeigt „69,1 Bio. €“, voller Wert im Tooltip
    <StatTile label="Bargeld" value={8412} hint="6,8 % des Depots" />
  </StatGroup>
</Card>
```

## Barrierefreiheit

- Label 6,1:1, Wert 11,8:1 auf `bg-card`; Veränderung und Sparkline werden vorgelesen.
- `StatGroup` ist eine beschriftete Gruppe (`aria-label`, z. B. „Depot-Kennzahlen“).
- Der Aufrufer liefert: Werte als Zahlen, Veränderung in Prozent, Kursreihe für die Sparkline.
