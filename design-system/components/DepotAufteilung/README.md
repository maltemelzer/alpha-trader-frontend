Ringdiagramm der Depot-Aufteilung mit Plotly; Segmente in `chart-1` bis `chart-5` in fester Reihenfolge, Gesamtwert in der Mitte.

## Aufbau
- Ring mit `hole: 0.64`, 2px-Fuge in `bg-card` zwischen den Segmenten, Start oben, im Uhrzeigersinn, nicht sortiert (die Reihenfolge bestimmt die Farbe).
- Prozente außen in Monospace `text-secondary`, Legende rechts.
- In der Mitte: Depotwert in Monospace `text-primary`, darunter das Label „DEPOTWERT“.
- Tooltip: Name, Betrag in Euro, Anteil.

## Regeln
- Höchstens 5 Segmente. Weitere Positionen als „Sonstige“ in `line-strong` zusammenfassen.
- Nie Gewinn-/Verlustfarben für Segmente.
- Prozentbeschriftung und Legende immer anzeigen, damit die Zuordnung nie allein über die Farbe läuft.
