Liniendiagramm, das die Entwicklung des Portfolios (Buchwert) mit dem ATSX und einem Allianz-Index vergleicht, jeweils in Prozent ab Beginn des Zeitraums (alle Linien beginnen bei 0 %).

## Aufbau
- Kopf: Titel, Zeitraum in `label`; rechts der ATSX und der Vorsprung in Punkten (`text-secondary`, Mono) und die eigene Veränderung als Etikett (▲/▼, Vorzeichen).
- Linien 2px: `chart-1` Ihr Portfolio, `chart-2` ATSX, `chart-4` Allianz-Index. Es sind Vergleichsreihen, deshalb **nicht** in `gain`/`loss`.
- Nulllinie in `line-strong`. y-Achse **links**, weil die Linienenden rechts beschriftet sind: Name und Endwert in Mono, eigenes Portfolio in `text-primary`, die anderen in `text-secondary`. Zu nahe Beschriftungen werden automatisch auseinandergeschoben.
- Tooltip: ein gemeinsamer Tooltip pro Tag, Werte mit Vorzeichen.

## Regeln
- Höchstens 4 Linien. Mehr Spieler vergleicht man in der Rangliste, nicht im Liniendiagramm.
- Immer Prozent ab Start, nie Euro – sonst sind Portfolio und Index nicht vergleichbar.

## Was der Aufrufer liefert
Zeitreihen je Reihe (Datum, Wert in % seit Start), Namen, Zeitraum.
