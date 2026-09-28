Immobilien im Angebot: Gebäude (Listing-Typ `BUILDING`) mit Briefkurs und verfügbarer Stückzahl, günstigste zuerst.

## Aufbau

Symbol (Icon `bank` auf `bg-raised`), Name in Serif, ASIN und „n im Angebot“, rechts Briefkurs (Kurzform ab 1 Mrd.) und „Kaufen“ (secondary). Auf dem Handy rutscht der Kurs unter den Namen.

## Regeln

1. Immobilien sind Wertpapiere wie Aktien – gehandelt wird über die normale Order-Maske.
2. Wer eine Immobilie besitzt, bekommt den Unternehmenserfolg „BUILDING_OWNER“ (Messing nur dort, nicht in dieser Liste).

## API

`POST /api/v2/filter/pricespreads?page&size` mit Filter `listingFilter: type = BUILDING` und `spreadFilter: askSize > 0` → `{ results: ListingMarketFilterResultView[], totalResults }` (so macht es das Spiel; Seiten zu 1.000).
