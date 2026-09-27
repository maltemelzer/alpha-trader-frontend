Positionen eines Portfolios: Bestand, Geld/Brief, Einstand, Volumen und Buchgewinn bzw. -verlust. Ersetzt die Positionsliste der Portfolio-Seite.

## Spalten

| Spalte | Inhalt |
| --- | --- |
| Wertpapier | Name (Link), ASIN, Art |
| Anteile | Bestand, darunter „… in Orders“ (`committedShares`) |
| Geld / Brief | `currentBidPrice` / `currentAskPrice` mit Größe darunter; Anleihen und Repos in % mit 4 Nachkommastellen |
| Einstand | `averageBuyingPrice`; „–“ wenn 0 (geschürfte Coins, Geschenke) |
| Volumen | `volume`, Kurzform ab 1 Mio. |
| G/V | (Geldkurs − Einstand) × Anteile, darunter in %; bei %-notierten Papieren aus dem Volumen |
| Handeln | Menü: Verkaufen (freie Anteile zum Geldkurs), Nachkaufen (zum Briefkurs), Zum Wertpapier |

Summenzeile mit Gesamtvolumen und Gesamt-G/V ab zwei Positionen. Standardsortierung: Volumen absteigend (wie im Spiel).

## Regeln

1. **G/V ist Kursbewegung** gegen den Einstand – daher `gain`/`loss` mit ▲▼ und Vorzeichen (`ProfitLoss`). Das Spiel färbt dafür den Einstand grün/rot; hier trägt die eigene Spalte die Farbe, der Einstand bleibt neutral.
2. Bewertet wird zum **Geldkurs** (so viel bekäme man beim Verkauf), ohne Geldkurs zum letzten Preis.
3. Keine Messing-Knöpfe in Zeilen. Das Menü öffnet die Order-Maske (im `Sheet`) vorbelegt; ausgeführt wird erst dort.

## API

- `GET /api/v2/my/portfolio` → `positions[]` (Felder siehe `PortfolioPosition` in `index.d.ts`).
- Das Menü liefert `{ action, position, price, numberOfShares }` für `POST /api/securityorders`.

## Verwendung

```jsx
const { PositionTable, Sheet, OrderTicket } = window.Bankiersgruen;
<PositionTable positions={portfolio.positions} hrefFor={p => `/wertpapier/${p.listing.securityIdentifier}`}
               onTrade={t => openOrderSheet(t)} />
```

## Barrierefreiheit

- Echte Tabelle mit Spaltenköpfen und sortierbaren Köpfen (`aria-sort`). G/V wird als „Gewinn 95,2 Mio. €, +18,54 %“ vorgelesen, Kurzformen haben den vollen Wert im Tooltip.
- Geld/Brief-Köpfe sind `Term`-Begriffe mit Erklärung.
