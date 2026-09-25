# Diagramme mit Plotly

Alle Diagramme im Spiel werden mit **Plotly** (plotly.js 3.x) gebaut – im Stil einer Finanzzeitung: ruhige Achsen, feine Gitterlinien, Zahlen in Monospace, Farben aus den Tokens. Die Live-Beispiele stehen in der Gruppe **Diagramme**: Kursverlauf, Kerzenchart, DepotAufteilung, DepotVergleich, MarktHeatmap, GewinnerVerlierer, Markttiefe, HighscoreVerlauf, DepotWasserfall, RisikoRendite und Dividenden.

## Einbinden (Web)

Plotly laden, dann das Theme verwenden. Das Theme liest die CSS-Variablen aus `tokens.css`. So passen Farben und Schriften automatisch, auch im Farbenblind-Modus.

```html
<script src="https://cdn.jsdelivr.net/npm/plotly.js-dist-min@3.7.0/plotly.min.js"></script>
```

```js
/* Bankiersgrün – Plotly-Theme. Liest die Design-Tokens (CSS-Variablen aus tokens.css),
   damit Darkmode und Farbenblind-Modus automatisch stimmen. */
function bankiersgruenPlotly() {
  var cs = getComputedStyle(document.documentElement);
  var v = function (n) { return cs.getPropertyValue('--' + n).trim(); };
  var sans = v('font-sans'), serif = v('font-serif'), mono = v('font-mono');
  var axis = {
    showgrid: false, zeroline: false, showline: true, linecolor: v('line-strong'), linewidth: 1,
    ticks: '', automargin: true, fixedrange: true,
    tickfont: { family: mono, size: 11, color: v('text-secondary') }
  };
  return {
    tokens: v,
    layout: {
      paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
      font: { family: sans, size: 12, color: v('text-secondary') },
      title: { font: { family: serif, size: 18, color: v('text-primary') }, x: 0, xanchor: 'left' },
      colorway: [1, 2, 3, 4, 5].map(function (i) { return v('chart-' + i); }),
      separators: ',.',
      margin: { l: 0, r: 0, t: 8, b: 0 },
      xaxis: Object.assign({}, axis, {
        showspikes: true, spikemode: 'across', spikesnap: 'cursor', spikedash: 'solid',
        spikecolor: v('line-strong'), spikethickness: 1
      }),
      yaxis: Object.assign({}, axis, { side: 'right', showline: false, showgrid: true, gridcolor: v('line'), gridwidth: 1 }),
      hovermode: 'x unified',
      hoverlabel: { bgcolor: v('bg-raised'), bordercolor: v('line-strong'),
                    font: { family: mono, size: 12, color: v('text-primary') } },
      legend: { orientation: 'h', x: 0, y: -0.12, bgcolor: 'rgba(0,0,0,0)',
                font: { family: sans, size: 12, color: v('text-secondary') } },
      dragmode: false
    },
    config: { displayModeBar: false, responsive: true, scrollZoom: false }
  };
}
/* Bei Theme-Wechsel (z. B. Farbenblind-Modus) neu zeichnen */
function bankiersgruenWatch(render) {
  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

// Verwendung
function render() {
  var t = bankiersgruenPlotly(), v = t.tokens;
  Plotly.react('chart', [{
    x: daten.x, y: daten.y, type: 'scatter', mode: 'lines',
    line: { color: v(steigt ? 'gain' : 'loss'), width: 2 },
    xhoverformat: '%d.%m.%Y', hovertemplate: '%{y:,.2f} €<extra></extra>'
  }], Object.assign({}, t.layout, { showlegend: false }), t.config);
}
render();
bankiersgruenWatch(render); // zeichnet neu, wenn der Farbenblind-Modus umgeschaltet wird
```

## Einbinden (Python / statisch)

Für Server-Rendering, Notebooks oder Exporte gibt es dasselbe Theme als fertiges Plotly-Template mit festen Hex-Werten: `assets/Charts/plotly-template.json`, dazu `plotly-template-farbenblind.json`. Es überschreibt nur die Kerzenfarben.

```python
import json, plotly.io as pio, plotly.graph_objects as go
pio.templates["bankiersgruen"] = go.layout.Template(json.load(open("plotly-template.json")))
pio.templates.default = "bankiersgruen"
# Farbenblind-Modus: pio.templates.default = "bankiersgruen+bankiersgruen_cb"
```

## Grundeinstellungen des Themes

| Element | Einstellung | Token |
| --- | --- | --- |
| Hintergrund | transparent, die Karte (`bg-card`) scheint durch | – |
| Gitter | nur horizontal, 1px | `line` |
| Achsenlinie | nur x-Achse, 1px | `line-strong` |
| Achsenbeschriftung | Monospace 11px, y-Achse rechts (Börsenkonvention) | `text-secondary`, `font-mono` |
| Titel | Serif 18px, linksbündig – besser: Titel im HTML darüber | `text-primary`, `font-serif` |
| Tooltip | ein gemeinsamer Tooltip pro Zeitpunkt, senkrechte Linie | `bg-raised`, `line-strong`, `text-primary` |
| Farbfolge | `chart-1` … `chart-5` in fester Reihenfolge | `chart-*` |
| Zahlenformat | `separators: ',.'` → 1.234,56; Datum `%d.%m.`; große Achsenwerte mit `tickformat: '.3s'` und eigener Beschriftung Mio./Mrd./Bio. | – |
| Toolbar | ausgeblendet, kein Zoomen per Mausrad | – |

## Regeln für Diagramme

1. **Kursrichtung = Gewinn/Verlust-Farbe.** Kurslinien und Kerzen nehmen `gain` oder `loss`. Das ist die einzige Stelle, an der diese Farben in Diagrammen vorkommen (Regel 2). Kategorien wie Branchen oder Depots nie in Grün/Rot.
2. **Nie nur Farbe (Regel 3).** Über jedem Kursdiagramm stehen Kurs und Veränderung mit ▲ / ▼ und Vorzeichen als Etikett (`PriceChange variant="tag"`). In Tooltips steht die Veränderung ebenfalls mit Pfeil.
3. **Kategorien in fester Reihenfolge.** `chart-1` Messing, `chart-2` Tintenblau, `chart-3` Kupfer, `chart-4` Petrol, `chart-5` Pflaume. Eine Kategorie behält ihre Farbe, auch wenn andere ausgefiltert werden. Mehr als 5 Kategorien → die kleinsten zu „Sonstige“ zusammenfassen, in `line-strong`.
4. **2px-Fuge** in `bg-card` zwischen Ringsegmenten und nebeneinanderliegenden Balken.
5. **Direkt beschriften.** Ringdiagramme zeigen Prozente außen am Segment plus Legende. Liniendiagramme mit bis zu 4 Linien beschriften das Linienende.
6. **Flach.** Keine Verläufe, keine Schatten, keine 3D-Diagramme. Linien 2px, Kerzen-Dochte 1px.
7. **Eine y-Achse.** Keine Diagramme mit zwei y-Skalen. Kurs und Volumen in zwei übereinanderliegenden Diagrammen.
8. **Beschriftungen in Textfarben.** Werte, Achsen und Legenden in `text-primary` / `text-secondary`, nie in der Serienfarbe.
9. **Grün/Rot nur für Kurse, auch bei Geldflüssen.** Kauf- und Verkaufsaufträge (Markttiefe), Gewinnausschüttungen, Zinsen, Gehalt und Cashflow sind keine Kursbewegung: Kategorienfarben oder neutrale Töne (`text-muted`, `text-secondary`).
10. **Kein Messing-Tint in Diagrammen.** Er ist Belohnungen vorbehalten (Regel 5); Diagramme zeigen Daten, keine Belohnungen.
11. **Heatmaps mischen, nicht voll färben.** Kachelfarbe = Mischung aus Tint und `gain`/`loss` (höchstens 42 %), damit Text in `text-primary` lesbar bleibt. Die Veränderung steht immer als Text in der Kachel.
12. **Achse links bei Linienend-Beschriftung.** Wenn die Linienenden rechts beschriftet sind (DepotVergleich, HighscoreVerlauf), wandert die y-Achse nach links.
13. **Balken beginnen bei null.** Keine abgeschnittenen y-Achsen bei Balken und Wasserfällen.
14. **Prognosen schraffiert.** Erwartete oder geplante Werte bekommen eine Schraffur in der Serienfarbe und eine gepunktete Trennlinie mit Beschriftung.

## Welches Diagramm wofür

| Frage | Form |
| --- | --- |
| Wie hat sich der Kurs entwickelt? | Liniendiagramm (Kursverlauf) |
| Wie verlief der Handelstag im Detail? | Kerzenchart (Candlestick), ab ca. 20 Kerzen |
| Wie ist mein Depot aufgeteilt? | Ringdiagramm, max. 5 Segmente, Gesamtwert in der Mitte |
| Welche Aktien liefen heute am besten? | Horizontales Balkendiagramm, Balken in `gain`/`loss` (GewinnerVerlierer) |
| Bin ich besser als der Markt? | Linien in % ab Start, Portfolio vs. ATSX vs. Allianz-Index (DepotVergleich) |
| Wie steht der ganze Markt heute? | Treemap nach Allianz-Index, Farbe = Veränderung (MarktHeatmap) |
| Wo liegen Angebot und Nachfrage? | Stufendiagramm des Orderbuchs (Markttiefe) |
| Wie hat sich mein Highscore-Platz entwickelt? | Bump-Chart je Kategorie (HighscoreVerlauf) |
| Woraus besteht mein Ergebnis? | Wasserfall aus gestapelten Balken (DepotWasserfall) |
| Welche Positionen sind riskant? | Streudiagramm Schwankung/Rendite (RisikoRendite) |
| Wann kamen meine Gewinnausschüttungen? | Gestapelte Balken je Monat, angekündigte schraffiert (Dividenden) |
| Nur eine Zahl (z. B. Buchwert) | Kein Diagramm – `figure-lg` mit Etikett (`PriceChange`) |

## Diagrammpalette – geprüft

| Reihe | Farbe | Wert |
| --- | --- | --- |
| `chart-1` | Messing | #B98C38 |
| `chart-2` | Tintenblau | #578ED4 |
| `chart-3` | Kupfer | #CC7044 |
| `chart-4` | Petrol | #1FAAA4 |
| `chart-5` | Pflaume | #A462B4 |

Geprüft mit einem Validator für Farbfehlsichtigkeit auf `bg-card` (#182A22), die Nachbarschaft von `chart-5` und `chart-1` im Ring mit eingerechnet:

- Helligkeit und Sättigung: alle Töne im Band für dunkle Flächen, keiner wirkt grau.
- Rot-Grün-Schwäche: schwächstes Nachbarpaar Pflaume ↔ Petrol ΔE 8,9 (Ziel ≥ 8).
- Normales Sehen: schwächstes Nachbarpaar ΔE 23,0 (Ziel ≥ 15).
- Kontrast zur Karte: alle ≥ 3:1.

Hinweise: Messing und Kupfer sehen sich bei Rot-Grün-Schwäche ähnlich, deshalb stehen sie in der Reihenfolge nie nebeneinander. Die Reihenfolge nie umsortieren. Petrol ersetzt das frühere Salbei, weil Salbei zu nah am Gewinn-Grün lag. Legende und Prozentbeschriftung bleiben trotzdem Standard (Regel 5).


## Handy (unter 520 px Breite)

Diagramme lesen ihre Breite beim Zeichnen (`clientWidth < 520`) und zeichnen bei Größenänderung neu (`resize`, 150 ms verzögert).

1. **Beschriftungen kürzen:** Namen auf ca. 11 Zeichen mit „…“, Achsenkategorien in Kurzform („Gewinne“, „Aussch.“).
2. **Beträge in Tsd.** an Balken (`+18,4 T€`), voller Wert im Hover.
3. **Endbeschriftungen rechts** (Liniendiagramme) entfallen; stattdessen Legende unter dem Diagramm.
4. **Kopf untereinander:** Titel, darunter Kennzahl und Etikett; Kennzahl 24 px, nie umbrechen (`white-space: nowrap`).
5. Höchstens 5 Reihen – auf dem Handy lieber 3.
