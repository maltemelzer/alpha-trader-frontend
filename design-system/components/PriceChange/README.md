Kursveränderung mit Pfeil, Vorzeichen und Farbe; als Kurszettel (`text`) in Listen und Tabellen, als Etikett (`tag`) nur bei wichtigen Einzelwerten.

## Varianten

| Variante | Aussehen | Wofür |
| --- | --- | --- |
| `text` (Standard) | nur farbiger Text in Monospace, keine Fläche | Jede Liste und Tabelle: Watchlist, Depot, Orderbuch, Top-/Flop-Listen. Wie die Kursliste im Wirtschaftsteil. |
| `tag` | getönte Fläche (`gain-tint` / `loss-tint` / `bg-raised`), Ecken `radius-sm` | Wichtige Einzelwerte neben einer großen Zahl (`figure-lg`): Tagesperformance des Depots, Kopf eines Kursdiagramms, Ranglisten-Ergebnis. Höchstens zwei bis drei pro Bildschirm. |

Richtung, Pfeil und Vorzeichen ergeben sich aus `value`:

- steigend: `▲ +2,34 %` in `gain`
- fallend: `▼ −0,62 %` in `loss` (echtes Minuszeichen)
- unverändert (rundet auf 0): `± 0,00 %` in `unchanged`

Mit `amount` zusätzlich der Betrag: `▲ +1,12 € (+2,34 %)`. Mit `suffix` ein Zusatz: `▲ +1,84 % heute`.

## Größen

`sm` 12px (dichte Tabellen) · `md` 13px (Standard, passt zu `figure`) · `lg` 15px (neben `figure-lg`).

## Regeln

1. **In Listen immer `text`.** Eine Spalte voller Etiketten wird unruhig und nimmt Einzelwerten die Hervorhebung.
2. **Etikett nur neben großen Zahlen** (Regel 4).
3. **Nie ohne Pfeil und Vorzeichen** (Regel 3). Die Komponente erzwingt beides, auch im Farbenblind-Modus.
4. **Nur für Kursbewegungen.** Für andere Zahlen (Rang, Punkte, Stückzahl) keine `gain`/`loss`-Farben.

## Verwendung

```jsx
const { PriceChange } = window.Bankiersgruen;

<PriceChange value={2.34} />                                  // ▲ +2,34 %
<PriceChange value={-0.62} />                                 // ▼ −0,62 %
<PriceChange value={1.84} variant="tag" size="lg" suffix="heute" />
<PriceChange value={2.34} amount={1.12} />                    // ▲ +1,12 € (+2,34 %)
```

## Barrierefreiheit

- Kontrast: `gain` 8,3:1 und `loss` 5,4:1 auf `bg-card`; auf den getönten Flächen 6,4:1 und 5,2:1. Farbenblind-Modus: Blau 7,1:1, Orange 6,6:1.
- Screenreader lesen „gestiegen um 2,34 Prozent“ statt der Pfeilzeichen.
- Der Aufrufer liefert: die Veränderung in Prozent als Zahl (nicht als Text), damit Richtung und Farbe stimmen.
