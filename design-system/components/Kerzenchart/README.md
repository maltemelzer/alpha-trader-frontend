Candlestick-Diagramm für Tageskerzen mit Plotly; steigende Kerzen in `gain`, fallende in `loss`, Dochte 1px.

## Aufbau
- Kopf wie beim Kursverlauf: Name, Ticker, letzter Schlusskurs, Veränderung als Etikett (`PriceChange variant="tag"`) mit ▲/▼.
- Kein Range-Slider, kein Zoom. Ab ca. 20 Kerzen sinnvoll, darunter lieber das Liniendiagramm.
- Tooltip auf Deutsch: Eröffnung, Hoch, Tief, Schluss und Tagesveränderung mit Pfeil (über `text` + `hoverinfo: 'x+text'`).

## Was der Aufrufer liefert
Pro Tag Eröffnung, Hoch, Tief, Schluss. Im Farbenblind-Modus werden die Kerzen automatisch Blau/Orange.
