Die Karte zeigt ein Wertpapier kompakt im Chat (`!ASIN`): Name, Kurs mit Veränderung, Kursverlauf als Sparkline und drei Eckdaten. Die ganze Karte öffnet das Wertpapier.

## Aufbau

- **Kopf:** Name in Serif 15px, darunter ASIN in Mono und die Art; rechts Kurs in Mono 16px (Anleihen/Repos in %) und `PriceChange` mit Zeitraum („24 h“).
- **Verlauf:** `Sparkline` über die volle Breite (56px hoch, skaliert mit), Zeitraum („30 T“) klein oben links. Ohne Kurse: gestrichelter Kasten „Kein Kursverlauf“.
- **Eckdaten (`facts`):** höchstens drei Spalten unter einer Haarlinie, Label in `label`-Schrift, Wert in Mono 12px – z. B. Geld · Brief · Spread, bei Aktien Börsenwert, bei Anleihen Zins.
- **Fläche:** `bg-card`, Haarrahmen `line-strong`, `radius-md`, flach. Hover `bg-raised`, Fokus Messing-Rahmen.
- **Laden (`loading`):** Skelett in derselben Höhe – kein Sprung, wenn die Daten kommen. **Fehler (`error`):** nur ASIN und Hinweis.

## Regeln

1. **Farbe nur für Kurse:** Sparkline und Veränderung tragen Grün/Rot, der Rest ist neutral.
2. **Richtung** immer mit ▲/▼ und Vorzeichen (über `PriceChange`).
3. **Klein bleiben:** höchstens 340px breit im Chat, keine Tabelle, keine zweite Grafik. Wer mehr sehen will, öffnet das Wertpapier.

## Verwendung

```jsx
const { AssetCard } = window.Bankiersgruen;

<AssetCard asin="ACALPHCOIN" name="AlphaCoins" listingType="COIN" price={18523.4} change={1.8} changeSuffix="24 h"
  spark={closes30d} period="30 T" href="/wertpapier/ACALPHCOIN"
  facts={[{ label: 'Geld', value: '18.400,00 €' }, { label: 'Brief', value: '18.600,00 €' }, { label: 'Spread', value: '1,08 %' }]} />

<AssetCard asin="STSN3G03LB" loading />
```

## Barrierefreiheit

- Als Link beschreibt der Inhalt das Ziel (Name, Kurs, Veränderung); die Sparkline hat ein Label mit Anfang, Ende und Veränderung in Worten.
- Beim Laden `aria-busy="true"`.
