Seitenvorlage „Kapitalmaßnahmen“: alle laufenden und angekündigten Maßnahmen, je Art eine Tabelle mit Restzeit. Keine eigene Komponente – `PageHeader`, `Card`, `DataTable` und `Countdown`.

| Tabelle | API | Spalten |
| --- | --- | --- |
| Kapitalerhöhungen | `GET /v2/capitalincreases` | Unternehmen, Art (mit/ohne Bezugsrechte), Beginn, Mindestvolumen, Restzeit bis Ende |
| Kapitalherabsetzungen | `GET /v2/capitalreductions` | Unternehmen, Anteile, Preis, Höchstvolumen, Restzeit |
| Gewinnausschüttungen | `GET /v2/dividendpayments` | Unternehmen, Höchstvolumen, Beginn |
| Fusionen | `GET /v2/mergers` | übernommene AG, übernehmende AG, Abfindung, Beginn |

Beträge ab 1 Mio. gekürzt, Restzeit kurz („2 T 4 h“). Zeilen verlinken auf die Wertpapierseite.
