Seitenvorlage „Meine Organisation“ – die Startseite des Spielers nach dem Login: alles, was ihm gehört und was er führt.

**Name:** Im Spiel heißt die Seite „Mein Imperium“ (`/empire`, API `…/empireshare`). In der Oberfläche sagen wir **Organisation** – sachlich wie eine Bank, nicht martialisch. Technische Namen bleiben unverändert.

## Aufbau

1. `PageHeader`: Spielername als Rubrik, Platz im Highscore, Anzahl CEO-Posten. Einziger Messing-Knopf: „Order aufgeben“.
2. Zwei Karten: **Privatportfolio** (`PortfolioSummary`) und **Vorschläge** (`SuggestionList`).
3. Breite Karte mit `Tabs`: **Positionen** (`PositionTable`) · **Offene Orders** (`OrderList`) · **Trades** (`TradeStats` + `TradeLog`).
4. **Unternehmensentwicklung** (`CompanyDevelopment`).
5. **Beteiligungen** und **Übernahmemöglichkeiten** (`ShareList`).

Unter 960px eine Spalte; Tabellen scrollen waagerecht, die erste Spalte bleibt stehen.

## Datenquellen

`/api/v2/my/portfolio`, `/api/v2/suggestions`, `/api/v2/securityorders`, `/api/v2/securityorderlogs`, `/api/v2/trades/stats/summary`, `/api/v2/my/companydevelopment`, `/api/v2/my/companiesbyempireshare`, `/api/v2/my/takeoverpossibilities`. Jede Karte lädt für sich und zeigt solange `Loading`.

## Abweichungen vom Spiel

- Portfolio und Organisation sind zusammengelegt; die eigene Portfolio-Seite bleibt für Unternehmensdepots.
- „Anstellungen“ und „Erfolge“ fehlen noch in der Vorlage (Erfolge: `Achievement`).
