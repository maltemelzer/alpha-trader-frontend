Laufende Orders und Trades des ganzen Markts („Live-Statistiken“ im Spiel).

## Aufbau

- Kopf: pulsierender Punkt (in `text-primary`, kein Grün) und Titel; rechts „Anhalten/Fortsetzen“.
- Zeile: Kauf/Verkauf (Tintenblau/Kupfer) · Name und ASIN · Stückzahl × Kurs · Uhrzeit. Neue Zeilen erscheinen oben und leuchten kurz in `bg-raised` auf.
- In schmalen Containern (unter 520 px) zweizeilig.

## Regeln

1. Höchstens 10–12 Zeilen; ältere fallen weg.
2. Angehalten heißt: Liste friert ein, Screenreader-Ansage aus. Wer liest, soll nicht überrollt werden.
3. Bei „Bewegung reduzieren“ ohne Puls und ohne Aufleuchten.

## API

Das Spiel lädt die Liste über `GET /api/marketstatistics` bzw. `/ats/tradenews` (beide im Spec untypisiert) und aktualisiert über den WebSocket. Für den Ticker reichen `listing`, `price`, `numberOfShares`, `action`, `date`.
