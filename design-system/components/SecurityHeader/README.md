Kopf der Wertpapierseite: Kennung, Name mit Messing-Linie, letzter Kurs, Geld und Brief mit Schnellaktion, Eckdaten und Reiter. Für alle Wertpapierarten – Aktien, Anleihen, Coins, Indizes, Fonds, Immobilien.

## Aufbau
1. **Kennzeile** in Versalien: ASIN (Mono), Wertpapierart (`LISTING_TYPES`), „notiert seit“, bei Anleihen „fällig“, bei Unternehmen der Anteil erreichter Erfolge.
2. **Name** in der Serifenschrift (36px) mit 2px-Messing-Linie – die Hauptüberschrift der Seite (Regel 6). Optional Logo (`company.logoUrl`).
3. **Kurs** rechts: letzter Preis groß in Mono, darunter die Veränderung als Etikett (`PriceChange variant="tag"` mit Betrag) und „Letzter Trade …“.
4. **Kurszeile:** Geld und Brief mit Stückzahl (gekürzt) und je einem Knopf **Verkaufen** / **Kaufen**, dazwischen der Spread. Beide Knöpfe sind `secondary` – gleich wichtig, also keiner Messing (Regel 1). Die Messing-Aktion der Seite ist „Order prüfen“ in der Order-Maske. Rechts optional Nebenaktionen (`actions`, z. B. „Beobachten“).
5. **Eckdaten** (`facts`): Label in Versalien, Wert in Mono, große Beträge gekürzt, optional eine Zeile darunter (`sub`). Für Aktien z. B. Marktkap., Anteile, Buchwert / Aktie, CEO mit Gehalt, Market Maker; für Anleihen Zins, Nennwert, Volumen, Emittent.
6. **Reiter** (`tabs`): Übersicht · Orderbuch · Anteilseigner · Trades · Kapitalmaßnahmen · Zeitung.

Anleihen und Repos werden durchgehend in % vom Nennwert notiert. Unter 720px Breite stehen Geld und Brief untereinander, der Spread entfällt.

## Kompakt (`compact`)
Für Seiten, die auf einen Bildschirm passen müssen (Wertpapierseite mit Kursverlauf, Orderbuch und Order-Maske darunter):
- kein Abstand über der Kennzeile, Kurszeile nur 12px unter dem Namen;
- Geld, Brief, Nebenaktionen und Eckdaten in **einer** Zeile, die Eckdaten durch eine senkrechte Linie abgesetzt; was nicht passt, wird rechts abgeschnitten (deshalb die wichtigsten Eckdaten zuerst);
- ohne Spread (steht im Orderbuch und in der Order-Maske).

Unter 720px Containerbreite brechen Kurszeile und Eckdaten wieder um; die Eckdaten stehen dann in einer eigenen Zeile ohne Linie links. Links in Eckdaten (z. B. CEO) erben die Textfarbe.

## Regeln
1. Kein Grün/Rot außer in der Kursveränderung. Kaufen und Verkaufen sind neutral.
2. Höchstens fünf Eckdaten – der Rest gehört in „Stammdaten“ und „Unternehmen“ auf der Seite.
3. Laufende Kapitalmaßnahmen oder eine Liquidation als `Banner` im `notice`-Platz, nicht als Farbe im Kopf.

## API
| Teil | Quelle |
| --- | --- |
| `listing` | `ListingView` (aus `/listingprofiles/{asin}`) |
| `spread` | `PriceSpreadView` (`/pricespreads/{asin}`) |
| `company` | `CompactCompanyView` (`/companies/securityIdentifier/{asin}`) |
| Gehalt, Anteile | `/v2/possibledailysalary/{userId}`, `/listings/outstandingshares/{asin}` |

## Verwendung
```jsx
const { SecurityHeader, Tabs, Button } = window.Bankiersgruen;

<SecurityHeader listing={listing} spread={spread} company={company}
  change={-0.05} changeAmount={-0.03} changeSuffix="heute"
  facts={[
    { label: 'Marktkap.', value: 209505763069094.88 },
    { label: 'Anteile', value: 3758625099912, currency: '' },
    { label: 'CEO', value: company.ceo.username, sub: '2,52 Mrd. € am Tag' },
  ]}
  onBuy={price => openOrder('BUY', price)} onSell={price => openOrder('SELL', price)}
  actions={<Button variant="ghost" size="sm" iconStart="+">Beobachten</Button>}
  tabs={<Tabs items={[{ value: 'ov', label: 'Übersicht' }, { value: 'ob', label: 'Orderbuch' }]} />} />

// Ein-Bildschirm-Seite
<SecurityHeader compact listing={listing} spread={spread} company={company} facts={facts}
  onBuy={…} onSell={…} />

// Kaufen/Verkaufen auch ohne Brief/Geld (die App öffnet dann eine Limit-Order zum letzten Kurs)
<SecurityHeader listing={listing} spread={spread} tradeWithoutQuote onBuy={…} onSell={…} />
```

## Barrierefreiheit
- `header` mit dem Namen als `h1` (über `as` änderbar). Die Kursveränderung liest sich „gefallen um 0,05 Prozent“.
- Gekürzte Eckdaten haben den vollen Wert für Screenreader.
