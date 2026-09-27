Streudiagramm der eigenen Positionen: Schwankung (Volatilität) nach rechts, Rendite seit Kauf nach oben, Kreisgröße = Positionswert.

## Aufbau
- Alle Kreise in `chart-2` mit 2px-Rand in `bg-card`, Ticker darüber (Mono, `text-secondary`).
- Nulllinie der Rendite in `line-strong`, Gitter in beide Richtungen in `line`.
- Vier Ecken beschriftet in `text-muted`: „Ruhig · im Plus“, „Riskant · im Plus“ usw., damit Einsteiger das Diagramm lesen können.
- Tooltip: Name, Rendite mit ▲/▼, Schwankung, Wert.

## Regeln
- Kreise nicht nach Gewinn/Verlust färben – die Lage über oder unter der Nulllinie zeigt das schon. Eine Farbe für alle.
- Kreisfläche (nicht Durchmesser) wächst mit dem Wert (Wurzel-Skala, Mindestgröße 10px).
- Ab etwa 15 Positionen Beschriftungen nur für die größten zeigen.

## Was der Aufrufer liefert
Je Position Ticker, Name, Volatilität in % p. a., Rendite seit Kauf in %, Wert in Euro.
