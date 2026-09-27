Bump-Chart: Platz der Top-Einträge einer Highscore-Kategorie Tag für Tag (API: `GET /v2/highscorehistoryentries?highscoreType=…&entityId=…`). Platz 1 oben.

## Aufbau
- y-Achse links, umgekehrt (1. oben), ganze Plätze. x-Achse Tage.
- Linien 2px mit Punkten, Farben `chart-1` … `chart-5` in fester Reihenfolge. Der eigene Eintrag 3px, größere Punkte, Beschriftung „Sie“ fett in `text-primary`.
- Linienenden rechts beschriftet mit aktuellem Platz und Name.
- Kopf: Kategorie (z. B. „Buchwert“), Art der Bestenliste (Nutzer, Unternehmen, Allianzen) und der eigene Platz.

## Regeln
- Höchstens 5 Linien. Der eigene Eintrag ist immer dabei, auch außerhalb der Top 5.
- Keine Farbe für Auf- oder Abstieg – die Linie zeigt die Bewegung.
- Für einen einzelnen Eintrag über lange Zeit lieber `Sparkline` oder ein Liniendiagramm des Werts.

## Was der Aufrufer liefert
Je Eintrag Name und Platz pro Tag (`position`, `date`), eigener Eintrag markiert.
