Liniendiagramm für den Kursverlauf einer Aktie mit Plotly; die Linie nimmt `gain` bei steigendem und `loss` bei fallendem Kurs im gezeigten Zeitraum.

## Aufbau
- Kopf (HTML, nicht Plotly): Aktienname in `stock-name`, Ticker und Zeitraum in `label`, aktueller Kurs in `figure-lg`, Veränderung als Etikett (`PriceChange variant="tag" size="lg"`) mit ▲/▼ und Vorzeichen.
- Darunter eine Haarlinie (`hairline`, `line`), dann das Diagramm.
- Diagramm: Linie 2px, keine Fläche darunter, y-Achse rechts, Datum `%d.%m.`, gemeinsamer Tooltip mit Kurs in Euro.

## Was der Aufrufer liefert
Zeitreihe (Datum, Schlusskurs), Aktienname, Ticker, Zeitraum. Theme: `bankiersgruenPlotly()` (siehe Abschnitt „Diagramme mit Plotly“).
