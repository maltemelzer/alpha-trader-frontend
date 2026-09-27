Der AlphaCoin-Miner des Spielers: Leistung, Speicher, Übertragen ins Portfolio und nächste Ausbaustufe. Gehört zur Seite „Meine Organisation“.

## Aufbau

- **Leistung** (Coins/Std.) und **übertragbare Coins**, jeweils mit €-Gegenwert zum aktuellen Kurs von `ACALPHCOIN`.
- **Speicher** als neutrale `ProgressBar` mit „voll in …“.
- **Speicher voll:** Hinweis mit ! in `text-primary` (kein Rot – es ist kein Fehler, sondern eine Aufgabe) und „Coins ins Portfolio übertragen“ wird zum Messing-Knopf, weil es dann die wichtigste Aktion ist.
- **Nächste Ausbaustufe:** Coins/Std. vorher → nachher, Kosten; „Ausbauen“ ist gesperrt, wenn das Bargeld nicht reicht.

## Regeln

1. Coins sind ein Wertpapier, keine Belohnung: kein Messing-Ton, keine Medaille.
2. Einheit „AC“ in Mono hinter der Zahl.
3. **Offen:** Das Spiel zeigt neben den Upgrade-Kosten eine Stundenzahl („29.193,29 € / 1,237h“). Deren Formel ist unklar und passt nicht zu Kosten ÷ Mehrertrag. Sie wird nur angezeigt, wenn sie übergeben wird (`paybackHours`).

## API

| Zweck | Endpunkt |
| --- | --- |
| Daten | `GET /api/v2/my/miner` → `MinerView` (`coinsPerHour`, `nextLevelCoinsPerHour`, `nextLevelCosts`, `maximumCapacity`, `storage`, `transferableCoins`) |
| Übertragen | `PUT /api/v2/my/cointransfer` |
| Ausbauen | `PUT /api/v2/my/minerupgrade` – vorher bestätigen lassen |
| Kurs | `GET /api/pricespreads/ACALPHCOIN` |

## Verwendung

```jsx
<Card title="Miner"><MinerCard miner={miner} coinPrice={spread.lastPrice.value} cash={portfolio.cash} onTransfer={transfer} onUpgrade={confirmUpgrade} /></Card>
```
