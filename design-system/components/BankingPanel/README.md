Bankgeschäfte eines Unternehmens: Banklizenz, Zentralbankreserven mit Zins, Zins-Boost mit AlphaCoins und der laufende Zinstender. Entspricht der Seite „Bankgeschäfte“ (`/banking/{asin}`) im Spiel.

## Zustände

| Zustand | Inhalt |
| --- | --- |
| Keine Lizenz | Erklärung in einem Satz, Fortschritt „Bargeld für die Lizenz“ bis 5 Mio. €, Knopf gesperrt |
| Lizenz möglich | Knopf „Banklizenz beantragen“ als Messing-Aktion |
| Mit Lizenz | Kennzahlen: Reserven · Zins auf Reserven pro Tag (Reservezins + Boost) · Zinsertrag je Tag · Zentralbankkredite genutzt von max. (`takenLoans`); darunter „Reserven erhöhen“ und „Zins-Boost mit AlphaCoins“ |

## Breite

Die Kennzahlen richten sich nach der Breite des Panels (Container Query), nicht des Fensters: ab 760px vier nebeneinander, darunter zwei je Zeile, bis 420px mit kleineren Beschriftungen (11px) und Werten (18px), unter 280px eine je Zeile. Beschriftungen brechen um, statt aneinanderzustoßen.

## Regeln

1. **Zinserträge sind Geldflüsse**, keine Kursbewegung: `SignedAmount` ohne Farbe.
2. Höchstens **ein** Messing-Knopf (`primaryAction`); im Standard sind beide Formulare sekundär.
3. Reserven erhöhen und Boost kaufen sind nicht umkehrbar → vor dem Absenden `Dialog` zur Bestätigung (das Spiel fragt „Sind Sie sicher?“).
4. Beträge prüfen, bevor der Knopf aktiv wird: nicht mehr als das verfügbare Bargeld.

## API

| Zweck | Endpunkt |
| --- | --- |
| Lizenz möglich? | `GET /api/v2/companycaps/{companyId}` → `{ bank, bankReady }` |
| Lizenz | `GET /api/bankinglicense?companyId` → `{ startDate }`; beantragen: `POST /api/bankinglicense?companyId` |
| Reserven | `GET /api/centralbankreserves?companyId` → `cashHolding`, `maxCentralBankLoans`, `interestRateBoost`, `earnedBoostBonus`, `coinsForNextBoost`, `maxBoostMultiplier` |
| Reserven erhöhen | `PUT /api/centralbankreserves?companyId&cashAmount` |
| Boost | `PUT /api/v2/centralbankreserves/{reservesId}?increaseInterestRateBoost=true&multiplier` (je Stufe +0,01 %) |
| Reservezins | `GET /api/maininterestrate/latest` → `reserveInterestRate` |
| Letzte Zahlung | `GET /api/v2/lastcentralbankreservespayment` → `paymentDate`, `paidInterest`, `nextPaymentDate` |
| Zinstender | `GET /api/v2/interesttenders` → `bondListing`, `endDate` |

Die 5 Mio. € Mindestbargeld stehen so im Spiel; als Konstante im Bundle (`BANK_LICENSE_MIN_CASH`).

## Offen

- Die Laufzeit des Boosts („+0,01 % auf 24 Std.“) ist aus dem Spieltext übernommen. Ob sich Boosts addieren oder verlängern, ist nicht dokumentiert.
- Aufgenommene Zentralbankkredite: `takenLoans` aus `companyprofiles/{id}` → `companyCapabilities.takenCentralBankLoans` zeigt „genutzt von max.“ (max. = 10 % der Reserven).
