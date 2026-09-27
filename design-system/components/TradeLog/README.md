Ausgeführte Trades eines Portfolios (`TradeLog`) und ihre Auswertung (`TradeStats`), wie „Tradestatistiken“ im Spiel.

## TradeStats

- **Ergebnis** (`netProfitLoss`) als Etikett mit ▲▼, daneben Trades, Trefferquote, Summe der Gewinne und der Verluste (als Beträge ohne Farbe).
- Darunter ein dünner Balken gewonnen / ausgeglichen / verloren mit Legende. Hier dürfen `gain`/`loss` stehen, weil Gewinn und Verlust aus Kursbewegungen stammen; die Legende trägt ▲/▼ zusätzlich.

## TradeLog

| Spalte | Inhalt |
| --- | --- |
| Zeit | `date` |
| Aktion | Kauf/Verkauf aus Sicht des eigenen Depots (Tintenblau/Kupfer) |
| Wertpapier | Name aus `names`, sonst nur ASIN |
| Anteile, Kurs, Volumen | Kurs je Art (% für Anleihen) |
| Gegenpartei | Name des anderen Depots |
| Ergebnis | nur bei Verkäufen: (Kurs − `sellerAverageBuyingPrice`) × Anteile, in % darunter |

## Regeln

1. Käufe haben kein Ergebnis („–“), nicht „0,00 €“.
2. Die Seite (Kauf/Verkauf) nie mit Grün/Rot färben.

## API

- `GET /api/v2/securityorderlogs?securitiesAccountId&search&page&size` → `SecurityOrderLogEntryView`
- `GET /api/v2/trades/stats/summary?securitiesAccountId&securityIdentifier&startDate&endDate` → `TradeSummaryView`
- `…/stats/best`, `/worst`, `/wins`, `/losses` sind im Spec untypisiert – noch nicht abgebildet.

## Verwendung

```jsx
const { TradeStats, TradeLog } = window.Bankiersgruen;
<TradeStats summary={summary} periodLabel="30 Tage" />
<TradeLog entries={log.content} securitiesAccountId={me.securitiesAccountId} names={namesByAsin} />
```
