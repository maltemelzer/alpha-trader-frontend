Offene Orders eines Portfolios mit Menü je Zeile.

## Aufbau

- **Aktion:** kleines Quadrat in Tintenblau (Kauf, `chart-2`) oder Kupfer (Verkauf, `chart-3`) plus Wort – dieselbe Zuordnung wie Orderbuch und Order-Maske. **Nie Grün/Rot**: Kaufen ist keine Kurssteigerung.
- **Wertpapier** mit ASIN, Ordertyp und bei OTC „OTC: Gegenpartei“.
- **Limit** (Anleihen in %), darunter die stündliche Änderung („+0,25 %/Std.“, nächste Änderung im Tooltip). Market-Orders zeigen „Market“.
- **Gültig:** „bis …“ oder „unbefristet“, darunter „ab …“ (zeitgesteuert, Gold) oder „seit …“ (erstellt).
- **Menü:** Zum Wertpapier · Order löschen (Verlustfarbe als Gefahrenzeichen).

## Regeln

1. Löschen immer mit `Dialog` bestätigen; danach `Toast` „Order gelöscht“.
2. Sortierung nach Ablauf – was bald verfällt, steht oben.
3. Ausgeführte Orders gehören in `TradeLog`, nicht hierher.

## API

| Zweck | Endpunkt |
| --- | --- |
| Liste | `GET /api/v2/securityorders?securitiesAccountId&page&size` → `SecurityOrderWithVolumeView` |
| Löschen | `DELETE /api/securityorders/{orderId}`; alle: `DELETE /api/securityorders` |
| OTC an mich | `GET /api/v2/securityorders?counterparty={securitiesAccountId}` |

## Verwendung

```jsx
<OrderList orders={orders} hrefFor={o => `/wertpapier/${o.listing.securityIdentifier}`} onDelete={confirmDelete} />
```

## Barrierefreiheit

- Das Menü je Zeile ist per Tastatur bedienbar und nennt das Wertpapier im Namen („Order Hanse Reederei AG“).
