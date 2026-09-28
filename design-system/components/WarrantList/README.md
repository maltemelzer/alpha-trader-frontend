Optionsscheine auf einen Basiswert (Index oder Aktie), wie auf der Wertpapierseite des Spiels.

## Spalten

Zeichnung bis (mit Restzeit) · Typ (Call/Put in Mono) · Referenzkurs des Basiswerts · Cap · Bezugsverhältnis · Emittent. Mit `showUnderlying` zusätzlich der Basiswert vorn – für eine Gesamtliste.

## Regeln

1. Call und Put sind keine Richtungsfarben: kein Grün/Rot, keine ▲▼. Der Typ steht als Wort.
2. Beendete Zeichnungsfristen bleiben stehen, darunter „beendet“.

## API

- `GET /api/v2/warrants?page&size` → `WarrantView` (`type`, `underlying`, `company`, `subscriptionPeriodDate`, `ratio`, `underlyingValue`, `underlyingCapValue`)
- Hebel für Call/Put eines Index: `IndexComparisonView` (`callLeverage`, `putLeverage`, `value`) → Prop `comparison`, steht als Zeile über der Tabelle.
