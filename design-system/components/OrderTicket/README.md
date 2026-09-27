Die Order-Maske, gebaut auf `POST /securityorders`: Wertpapier kaufen oder verkaufen, als Market- oder Limit-Order, aus dem privaten Portfolio oder für eine AG, mit Prüfung vor dem Absenden.

## Aufbau
1. **Kopf:** Name (Serif), ASIN und Wertpapierart, letzter Kurs, darunter Geld, Brief (mit Stückzahl) und Spread aus `PriceSpreadView`. Anleihen und Repos werden in **% vom Nennwert** notiert, alles andere in €.
2. **Portfolio** (`accounts`): erscheint nur bei mehreren Konten – privat oder die AGs, deren CEO man ist. Wird zu `owner`.
3. **Aktion:** `SegmentedControl` Kaufen / Verkaufen in `lg`, beide gleich – **keine Grün/Rot-Farben** (Button-Regel 2).
4. **Ordertyp:** Market / Limit (`type`). `QUOTE` bleibt Market-Makern vorbehalten und gehört nicht in diese Maske.
5. **Limit** (nur bei Limit): Feld plus Schnellwahl **Geld · Letzter · Brief** – ein Klick übernimmt den Kurs.
6. **Anteile oder Geldbetrag:** Umschalter „Betrag eingeben“. Ein Betrag wird in ganze Anteile umgerechnet und darunter angezeigt. „Max“ nimmt beim Kauf so viel, wie das Bargeld erlaubt, beim Verkauf den Bestand (`position.numberOfShares`).
7. **Weitere Optionen** (eingeklappt, „aktiv“, sobald etwas gesetzt ist):
   - **Stündliche Änderung** (`hourlyChange`, nur Limit): verschiebt das Limit jede Stunde.
   - **Gültig ab / bis** (`goodAfterDate` / `goodTillDate`): nur mit Goldzugang (`premium`), sonst gesperrt mit Hinweis und neutralem „Gold“-Kennzeichen – **kein Messing**, der Goldzugang ist keine Belohnung.
   - **Gegenpartei (OTC)** (`counterparty`): nur dieses Portfolio kann die Order ausführen.
8. **Schätzung:** Kurs (Brief beim Kauf, Geld beim Verkauf, sonst Limit) und Volumen; Bargeld vorher → nachher, große Beträge gekürzt.
9. **Messing-Button „Order prüfen“** in `lg`, volle Breite.
10. **Prüfen:** Mit `onCheck` ruft die Maske die API mit `checkOrderOnly=true` auf und zeigt `OrderCheck.executionPrice` und `executionVolume`. Schlägt die Prüfung fehl (`checkResult.failed`), erscheint ein Fehler-`Banner` mit `msg.filledString`, und die in `concerningParams` genannten Felder werden markiert. Sonst folgt die Übersicht mit „Ändern“ und „Kaufen bestätigen“ (erhält den Fokus). Mit `confirm={false}` entfällt der Schritt.

Es gibt **keine Ordergebühren** in der Maske – die API kennt keine.

## Prüfungen im Browser
| Fall | Meldung |
| --- | --- |
| keine ganze Zahl ≥ 1 | Bitte eine ganze Zahl ab 1 eingeben. |
| Betrag reicht nicht | Der Betrag reicht für keinen Anteil. |
| Kauf zu teuer | Nicht genug Bargeld – höchstens 20.375 Anteile. |
| Verkauf über Bestand | Im Portfolio sind nur 2.500.000 Anteile. |
| Limit fehlt | Bitte ein Limit eingeben. |
Alles Weitere (Mindestpreise, Sperren) prüft der Server über `onCheck`.

## Regeln
1. Die Maske hat **einen** Messing-Button. Steht sie auf einer Seite mit anderer Hauptaktion, `submitVariant="secondary"`.
2. Auf dem Handy als volle Seite oder unten ausklappende Fläche, nie als kleines Popup.
3. Beim Wechsel von Portfolio, Aktion oder Typ verfällt ein altes Prüfergebnis.

## Verwendung
```jsx
const { OrderTicket } = window.Bankiersgruen;

<OrderTicket
  listing={{ securityIdentifier: 'STSN3G03LB', name: 'Alphakasse SE', type: 'STOCK' }}   // ListingView
  spread={priceSpread}                                                                   // GET /pricespreads/{asin}
  accounts={[{ id: myAccount.id, name: 'Mein Portfolio', privateAccount: true, cash }, ...companies]}
  position={sharePosition}                                                               // SharePositionView
  premium={user.userCapabilities.premium}
  onCheck={params => api.post('/securityorders', { params })}                            // params enthält checkOrderOnly: true
  onSubmit={params => api.post('/securityorders', { params })}
  loading={sending} />
// params = { owner, securityIdentifier, action: 'BUY'|'SELL', type: 'MARKET'|'LIMIT', price, numberOfShares,
//            hourlyChange, goodAfterDate, goodTillDate, counterparty }   – Zahlen als String mit Punkt, Datum in ms
```

## Offen
- Einheit von `hourlyChange` (absolut in € oder in %) mit der API abgleichen; die Maske zeigt „€ / h“.
- Anleihen: Volumen = Anteile × Nennwert × Kurs / 100 (`faceValue`). Bitte mit echten Orders gegenprüfen.

## Barrierefreiheit
- Formular mit Namen „Order Alphakasse SE“, Felder mit Beschriftung, Fehler über `aria-describedby`.
- Anteile: Pfeiltasten hoch/runter ändern um 1. „Weitere Optionen“ ist ein Knopf mit `aria-expanded`.
- Die Schnellwahl ist eine beschriftete Gruppe („Limit übernehmen“).
