Fonds (ETF) im Spiel: Eckdaten (`EtfFacts`) und Zeichnen/Zurückgeben von Anteilen (`EtfUnitsForm`).

## EtfFacts

Bildet ab (Index, Link) · Anbieter (Bank mit Lizenz) · Verwaltungsgebühr p. a. (mit „Änderung möglich ab …“) · Tracking-Differenz des letzten Monats. Eingefrorene Fonds und beendete Indizes zeigen darüber einen neutralen `Banner`.

## EtfUnitsForm

- `SegmentedControl` Zeichnen / Zurückgeben, Anteile als ganze Zahl mit −/+.
- Schätzung in einem Satz („Kostet ca. 5,02 Mio. €“), bei Rückgabe höchstens der eigene Bestand.
- Eingefrorene Fonds: Zeichnen gesperrt, Rückgabe möglich.

## Regeln

1. Tracking-Differenz ist eine Abweichung, keine Kursbewegung: Vorzeichen ja, Grün/Rot nein.
2. Gebühren immer mit „p. a.“.

## API

| Zweck | Endpunkt |
| --- | --- |
| Fonds | `GET /api/v2/etfs/{asin}` → `EtfView` |
| Zeichnen | `POST /api/v2/etfs/{asin}/subscriptions?units` |
| Zurückgeben | `POST /api/v2/etfs/{asin}/redemptions?units`; offene Rückgaben `GET …/redemptions` |
| Eigene (als Bank) | `GET /api/v2/my/funds`; anlegen `POST /api/v2/etfs`, Gebühr `POST …/management-fee?percent` |

**Offen:** Den Anteilswert (NAV) liefert `EtfView` nicht; bis dahin Kurs aus `pricespreads` verwenden.
