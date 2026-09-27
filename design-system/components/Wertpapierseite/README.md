Beispielseite für eine Aktie – so setzen sich die Komponenten zur Wertpapierseite zusammen. Keine eigene Komponente, sondern eine Vorlage.

## Aufbau
1. `SecurityHeader` mit Eckdaten, Schnellaktion Kaufen/Verkaufen und `Tabs`.
2. Zwei Spalten (Inhalt · 400px):
   - **Links:** Kursverlauf (Plotly, Zeitraum per `SegmentedControl`, Linie in `gain`/`loss` je nach Richtung im Zeitraum) · `OrderBook` · Stammdaten und Unternehmen als `SummaryList` · Anteilseigner und letzte Trades als `DataTable`.
   - **Rechts:** `OrderTicket` (die eine Messing-Aktion der Seite) · Beschreibung · „Unternehmen führen“ – nur für den CEO: alle Kapitalmaßnahmen als `secondary`, die Liquidation als `danger`.
3. Klick auf eine Orderbuch-Stufe öffnet die Order-Maske mit Limit und Richtung.
4. Unter 960px: eine Spalte, Order-Maske direkt unter dem Kopf.

## Andere Wertpapierarten
| Art | Unterschiede |
| --- | --- |
| Anleihe | Kurs in %, Eckdaten Zins, Nennwert, Volumen, Fälligkeit, Emittent; statt „Unternehmen“ die Emission |
| Coin | Keine Anteilseigner-Sicht nötig; Miner-Hinweis |
| Index / Fonds | Kein Orderbuch (keine Market Maker); Mitglieder bzw. NAV, Verwaltungsgebühr, Tracking-Differenz |
| Immobilie | Größe, Besitzer, Angebot |

## Daten
`/listingprofiles/{asin}`, `/pricespreads/{asin}`, `/orderbook/{asin}`, `/shareholders/{asin}`, `/v2/securityorderlogs/by-asin/{asin}`, `/v2/historizedlistingdata/{asin}`, `/companyprofiles/{companyId}`.
