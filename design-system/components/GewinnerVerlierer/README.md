Horizontale Balken für die Tagesgewinner und -verlierer, sortiert von oben (bester Wert) nach unten (schlechtester), um eine Nulllinie.

## Aufbau
- Namen links in der UI-Schrift (`text-primary`), Balken in `gain`/`loss`, Wert direkt am Balkenende mit ▲/▼ und Vorzeichen (Mono, `text-primary`).
- Keine x-Achsenbeschriftung – die Werte stehen an den Balken. Nulllinie in `line-strong`, zwischen Gewinnern und Verlierern eine Haarlinie.
- Kein Tooltip nötig.

## Regeln
- Je 5 Gewinner und Verlierer. Für mehr Werte die Tabelle (`DataTable`) verwenden.
- Beide Seiten auf derselben Skala, symmetrisch um null.

## Was der Aufrufer liefert
Name und Tagesveränderung in % je Aktie, schon gefiltert auf Top und Flop.
