Stufendiagramm des Orderbuchs: kumulierte Kaufaufträge links, kumulierte Verkaufsaufträge rechts vom aktuellen Kurs.

## Aufbau
- Kopf: Aktie, Geld, Brief und Spanne in Mono, Mittelkurs in `figure-lg`.
- Kaufaufträge in `chart-2` (Tintenblau), Verkaufsaufträge in `chart-3` (Kupfer), Linien 2px, Fläche darunter 16 % Deckkraft (flach, kein Verlauf).
- Mittelkurs als gepunktete Senkrechte in `text-muted` mit Beschriftung. Seiten direkt beschriftet, Legende im Fuß.
- x-Achse Preis in Euro, y-Achse Stück (kumuliert).

## Regeln
- **Kauf und Verkauf sind keine Kursbewegungen** – deshalb kein Grün/Rot (wie beim Button „Verkaufen“).
- Kurslücken nicht glätten: Stufen zeigen die echten Preisstufen.

## Was der Aufrufer liefert
Orderbuch als Preis/Stück-Paare für beide Seiten, Geld, Brief.
