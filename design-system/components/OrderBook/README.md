Das Orderbuch als Leiter: Angebot oben (bestes zuletzt, direkt über der Mitte), Spread und letzter Kurs in der Mitte, Nachfrage darunter. Ein Klick auf eine Stufe übernimmt Preis und Richtung in die Order-Maske.

## Aufbau
- Spalten: **Nachfrage · Preis · Angebot.** Der Preis steht in der Mitte, die Stückzahl auf ihrer Seite.
- **Tiefenbalken** hinter der Stückzahl, logarithmisch skaliert (sonst verschwinden kleine Stufen neben 4 Mrd. Anteilen). Nachfrage in `chart-2` (Tintenblau), Angebot in `chart-3` (Kupfer), je 22 % Deckkraft – wie in der Markttiefe. **Kein Grün/Rot**: Kauf und Verkauf sind keine Kursbewegung.
- **Kennzeichen:** „Ihre“ für Stufen mit eigenen Orders (Preis unterstrichen). Optional „MM“, falls der Aufrufer Market-Maker-Stufen kennt – die API liefert das nicht.
- **Mitte:** Spread absolut und in %, letzter Kurs.
- **Fuß:** Summe der Anteile und Zahl der Stufen je Seite, „Alle Stufen zeigen“ (Standard: je 8 Stufen, `depth`).
- Zeilen sind Knöpfe (`onSelect`) mit Hover `bg-raised`: Angebot → Kaufen, Nachfrage → Verkaufen.

## Regeln
1. Stückzahlen ab 1 Mio. gekürzt, Preise nie – der Preis ist die Information.
2. Anleihen: Preise in %, die Spaltenüberschrift sagt „Preis (%)“.
3. Keine Animation beim Aktualisieren; geänderte Stufen höchstens kurz mit `bg-raised` markieren.

## API
`GET /orderbook/{securityIdentifier}` liefert (so nutzt es auch der heutige Client):
```js
{ sellEntries: [{ priceLimit: 55.79, size: 21 }, …],   // Angebot
  buyEntries:  [{ priceLimit: 55.74, size: 8750037 }, …], // Nachfrage
  maxSellSize, maxBuySize }
```
Die Antwort kann direkt als `orderbook` übergeben werden. Alternativ `asks`/`bids` als `{ price, numberOfShares, own }`. Eigene Stufen (`own`) ergeben sich aus den offenen Orders (`GET /v2/securityorders`).

## Verwendung
```jsx
const { OrderBook } = window.Bankiersgruen;

<OrderBook listing={listing} orderbook={await api.get(`/orderbook/${asin}`)} lastPrice={spread.lastPrice.value} depth={8}
  onSelect={({ side, price }) => openOrder(side, price)} />
```

## Barrierefreiheit
- `section` „Orderbuch“ mit zwei geordneten Listen „Angebot“ und „Nachfrage“.
- Jede Stufe hat einen vollständigen Namen: „Angebot: 21 Anteile zu 55,79 € – kaufen“.
