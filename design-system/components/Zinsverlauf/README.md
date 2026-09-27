Verlauf der Zinsen im Spiel mit Plotly: Leitzins, Zins der Systemanleihe, Reservezins der Zentralbank und durchschnittlicher Anleihezins.

## Aufbau

- Kopf (HTML): Titel, Zeitraum, aktueller Leitzins in `figure-lg`.
- Leitzins, Systemanleihe und Reservezins als **Stufenlinien** (`line.shape: 'hv'`) – sie werden festgesetzt, nicht gehandelt. Der Ø Anleihezins ergibt sich aus dem Markt und ist deshalb gepunktet und nicht gestuft.
- Farben in fester Reihenfolge `chart-1` … `chart-4`; der Leitzins als wichtigste Reihe etwas dicker.
- Fuß: Legende mit aktuellen Werten (Ø Anleihezins mit 4 Nachkommastellen).
- y-Achse in %, ab 0.

## Regeln

1. Zinsänderungen sind keine Kursbewegung – keine Gewinn-/Verlustfarben, auch nicht für „Zins gestiegen“.
2. Zinsen in %, 2 Nachkommastellen (Leitzins) bzw. 4 (Marktdurchschnitt, wie Anleihekurse).

## API

- `GET /api/v2/interestratehistory?limit` → `[{ date, mainInterestRate, reserveInterestRate, systemBondInterestRate, averageBondInterestRate }]`
- Aktuell: `GET /api/maininterestrate/latest`, `GET /api/v2/averagebondinterestrate`
