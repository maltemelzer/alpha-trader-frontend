Anleihen am Markt (`BondList`), sortiert nach Fälligkeit – im Spiel laufen die meisten nur Stunden bis wenige Tage.

## Spalten

| Spalte | Inhalt |
| --- | --- |
| Anleihe | Emittent (Link), ASIN, Art |
| Zins p. a. | `interestRate`, 4 Nachkommastellen |
| Fällig | Restlaufzeit fett („3 Std. 11 Min.“), darunter das Datum; unter 1 Std. mit ◷ |
| Geld / Brief | in % vom Nennwert, 4 Nachkommastellen; fehlt eine Seite: „–“ |
| Volumen | Nennwert × Stücke, Kurzform |

## Regeln

1. Kurse von Anleihen und Repos immer in % (Brand-Book „Zahlen“), nie in €.
2. Restlaufzeit ist keine Kursbewegung: neutral, ohne Grün/Rot. „Bald fällig“ zeigt nur das ◷.
3. Zinsen sind Zahlen, keine Veränderungen – ohne ▲▼.

## API

- `GET /api/v2/bonds?search&page&size` → `BondView` (`priceSpread`, `issuer`, `interestRate`, `maturityDate`, `faceValue`, `volume`, `repurchaseListing`)
- Systemanleihen der Zentralbank: `GET /api/systembonds`

## Verwendung

```jsx
<BondList bonds={page.content} hrefFor={b => `/wertpapier/${b.listing.securityIdentifier}`} />
```
