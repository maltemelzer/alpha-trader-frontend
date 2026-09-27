Seitenvorlage „Markt“: `PageHeader` mit `MarketPulse` (online, Spieler, Unternehmen, Wertpapiere, Marktkapitalisierung), darunter `MarketFilterBar` und `MarketResults`, rechts der `LiveTicker`. Unter 960 px untereinander, die Ergebnisse werden zu Karten.

## MarketFilterBar

- Suche (Name oder ASIN) und Wertpapierart immer sichtbar; Kursspanne und „nur mit Angebot/Nachfrage“ hinter „Weitere Filter (n)“.
- Liefert bei jeder Änderung den Zustand **und** den fertigen API-Filter (`buildMarketFilter`), z. B. `listingFilter: type = STOCK AND name CONTAINS "hanse"`, `spreadFilter: askSize > 0`.
- „Filter speichern“ legt einen benannten Filter an (die API speichert Filter mit `name`, abrufbar über `/filter/pricespreads/{id}`).
- Trefferzahl mit `aria-live`.

## MarketResults

Wertpapier · Geld · Brief (je mit Stückzahl) · Spread, dazu `extraColumns` der App (z. B. „Rendite / Tag“ bei Anleihen: Rendite bis Fälligkeit zum Brief ÷ Resttage). Beträge ab 1 Mio. in Kurzform, Anleihen/Repos in %. Die Zeile ist ein Link zur Wertpapierseite.

## API

| Zweck | Endpunkt |
| --- | --- |
| Suchen (schnell) | `GET /api/v2/pricespreads?search&page&size` – Volltext über Name und ASIN, liefert Wertpapier und Spread (< 1 s) |
| Ohne Suchtext | `GET /api/v2/mostfrequentlytradedsecurities?type&page&size` – die meistgehandelten einer Art |
| Filtern (langsam) | `POST /api/v2/filter/pricespreads?page&size` mit `PriceSpreadListingViewFilter` → `{ results: [{ listing, price }], totalResults }` |
| Filterfelder | `GET /api/v2/filterdefinition/pricespreads` (erlaubte Felder, Operatoren, Werte) |
| Marktlage | `GET /api/v2/minimalstats`, `GET /ats/onlineusers` |
| Unternehmen filtern | `GET /api/v2/companies?search&bookValueMin…&netCashMin…&fairValuePerShareMin…` |

**Achtung Laufzeit (geprüft auf stable):** Der Filter-Endpunkt wertet die Bedingungen in Reihenfolge aus und berechnet Spreads für alle Treffer vor dem Blättern. `type = STOCK` allein dauert rund 3 Minuten (69.000 Treffer), `name CONTAINS …` zuerst bei wenigen Treffern unter 1 s. Für die Suche daher `GET /api/v2/pricespreads?search` nehmen und Art, Preisspanne, Angebot/Nachfrage im Browser filtern.

`MarketPulse` zeigt zusätzlich `trades24h` und `volume24h` aus `/api/v2/minimalstats` (`numberOfTrades24h`, `tradeVolume24h`). `MarketResults` nimmt `defaultSort`, z. B. `{ key: 'spread', dir: 'asc' }`.

**Offen:** Die Felder von `PriceSpreadMininalView` sind angenommen (`bidPrice`, `askPrice`, `bidSize`, `askSize`), wie das Spiel sie für Immobilien liest.
