Handelsleiste am unteren Rand der Wertpapierseite auf dem Handy: links „Verkaufen“ zum Geldkurs, rechts „Kaufen“ zum Briefkurs, jeweils mit Stückzahl. Ein Tipp öffnet die Order-Maske im `Sheet` (von unten), vorbelegt mit Richtung und Kurs.

## Regeln

1. **Beide Seiten sehen gleich aus.** Kein Messing, kein Grün/Rot – nur die kleinen Markierungen Tintenblau (Kauf) und Kupfer (Verkauf) wie in Orderbuch und Order-Liste. Die Messing-Aktion („Order prüfen“) kommt erst im Sheet.
2. Fehlt eine Seite im Orderbuch, ist der Knopf gesperrt und zeigt „–“.
3. Auf dem Handy entfallen dafür die Knöpfe im `SecurityHeader` (kein `onBuy`/`onSell` übergeben) und die `BottomNav`.
4. Anleihen und Repos in % (wie überall).

## Verwendung

```jsx
<TradeBar listing={listing} spread={spread} onTrade={t => openOrderSheet(t.action, t.price)} />
<Sheet open={!!side} side="bottom" title="Kaufen: Alsterkasse SE" onClose={close}><OrderTicket … /></Sheet>
```
