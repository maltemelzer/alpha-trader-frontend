# Bankiersgrün

Design-System für ein alternatives Web-UI von **Alpha-Trader** – der Finanzmarktsimulation, in der die Spieler den Markt machen: Sie gründen und führen Unternehmen, handeln Aktien, Anleihen, Coins, Fonds und Immobilien, und die Kurse entstehen allein aus ihrem Handel. Die Komponenten folgen der REST-API (v2); Props heißen wie die Felder dort. Darkmode. Dunkles Flaschengrün wie Schreibtischleder unter einer Bankierslampe, dazu Messing als Akzent. Die Anmutung ist klassisches Börsenparkett und Wirtschaftszeitung: edel, warm, ruhig – nicht technisch-kühl, kein Krypto-Neon.

## Haltung

- **Wie eine gute Finanzzeitung.** Klare Hierarchie, Zahlen im Mittelpunkt, feine Linien statt schwerer Kästen.
- **Messing heißt Handeln.** Wo Messing gefüllt ist, passiert etwas. Deshalb gibt es davon wenig.
- **Grün und Rot sind Marktsprache.** Sie melden Kursbewegungen und Fehler – sonst nichts.
- **Flach.** Keine Verläufe, kein Glow, keine starken Schatten. Tiefe entsteht über die drei Flächenstufen `bg-page` → `bg-card` → `bg-raised`.

## Farben

| Rolle | Token | Wert |
| --- | --- | --- |
| Seite | `bg-page` | #0F1C17 |
| Karte | `bg-card` | #182A22 |
| Erhöht / Hover | `bg-raised` | #213629 |
| Linie | `line` | #2C4237 |
| Linie stark (Gliederung) | `line-strong` | #3E5A4B |
| Rahmen von Bedienelementen | `line-control` | #5A7869 |
| Text primär | `text-primary` | #EAE3CF |
| Text sekundär | `text-secondary` | #A3B0A1 |
| Text gedämpft | `text-muted` | #8D9D91 |
| Text deaktiviert | `text-disabled` | #6E7F72 |
| Messing | `brass` / `brass-hover` / `brass-pressed` | #D9A94E / #E6BC68 / #B98C38 |
| Messing getönt | `brass-tint` + Text `reward-text` | #2A2412 + #E6BC68 |
| Text auf Messing | `on-brass` | #1E1608 |
| Gewinn | `gain` / `gain-tint` | #7FD1A3 / #1D3F2E · Farbenblind #82B6F0 / #1A2E44 |
| Verlust | `loss` / `loss-tint` | #EB7A6B / #3A231E · Farbenblind #F2955A / #3A2515 |
| Unverändert | `unchanged` | #A3B0A1 |
| Diagramme | `chart-1` … `chart-5` | Messing #B98C38, Tintenblau #578ED4, Kupfer #CC7044, Petrol #1FAAA4, Pflaume #A462B4 – mit Plotly, siehe Abschnitt „Diagramme mit Plotly“ |

**Farbenblind-Modus** ist als zweites Theme (`cb`) angelegt und tauscht `gain` → #82B6F0 (Blau), `loss` → #F2955A (Orange) und ihre getönten Flächen (`gain-tint` #1A2E44, `loss-tint` #3A2515). Alle anderen Tokens bleiben gleich.

## Typografie

- **Serif** (`serif`: Source Serif 4, Newsreader) – Überschriften und Aktiennamen, die Stimme der Zeitung. Stile `display`, `headline`, `title`, `stock-name`.
- **Sans** (`sans`: Libre Franklin – auf Basis von Franklin Gothic, der klassischen Zeitungs-Grotesk) – UI-Text und Labels. Kräftig und klar, aber mit historischer Wärme statt Tech-Kühle. Stile `body`, `label`; Labels in Versalien, leicht gesperrt, wie Rubriken.
- **Monospace** (`mono`: IBM Plex Mono, JetBrains Mono) – alle Kurse, Beträge und Prozente, damit Ziffern in Tabellen bündig stehen. Stile `figure-lg`, `figure`, `change`.

Die Schriften werden über Google Fonts geladen.

## Zahlen

Im Spiel reichen Beträge von `0,02 €` bis über `3.035.142.744.431.558,50 €`. Deshalb gilt:

- **Deutsches Format:** `124.380,50 €`, `+2,34 %`, echtes Minuszeichen `−`, geschütztes Leerzeichen vor der Einheit.
- **Kurzform ab 1 Mrd.** (in Kennzahlen, Kopfleiste, Übersichten) bzw. **ab 1 Mio.** (in engen Tabellen, Highscores, Order-Maske): `Mio.`, `Mrd.`, `Bio.`, `Brd.` mit höchstens drei gültigen Ziffern – `3,04 Brd. €`, `69,1 Bio. €`, `2,52 Mrd. €`. Der volle Wert steht immer im Tooltip und für Screenreader. Komponente: `Amount`; Funktionen: `Bankiersgruen.format`.
- **Kurse nach Wertpapierart:** Anleihen und Repos in Prozent vom Nennwert mit vier Nachkommastellen (`99,9280 %`), alles andere in Euro (`48,72 €`).
- **Datum** wie im Spiel: `24.9.2026, 06:47`. Die API liefert Millisekunden.
- **Kennungen** sind ASINs (`STSN3G03LB` Aktie, `BO…` Anleihe, `AC…` Coin, `ID…` Index) – in Mono, als Link zur Wertpapierseite, in Texten als `$ASIN`.

## Handy

Das Spiel wird viel unterwegs gespielt. Jede Komponente funktioniert ab **360 px**, geprüft bei 375 px.

- **Navigation:** unter 720 px `BottomNav` unten (5 Bereiche) statt des Menüs der `AppHeader` (dann `items` leer lassen, Wortmarke, Glocke und Spieler bleiben). Unterseiten mit `MobileTopBar` (Zurück, Titel, zwei Icons).
- **Handeln:** Auf der Wertpapierseite `TradeBar` unten; die Order-Maske öffnet als `Sheet` von unten mit großen Feldern (44 px).
- **Tabellen:** breite Tabellen mit `stack="auto"` – jede Zeile wird zur Karte, Sortierung als Auswahl. Schmale Tabellen scrollen waagerecht mit fester erster Spalte.
- **Kennzahlen:** `StatGroup`, Profilkopf und Bank-Kennzahlen gehen auf zwei Spalten.
- **Diagramme:** unter 520 px Beschriftungen kürzen, Endbeschriftungen durch eine Legende ersetzen, Beträge in Tsd. (siehe „Diagramme mit Plotly“).
- **Tippflächen** mindestens 44 × 44 px; keine Funktion nur per Hover (Tooltips öffnen auch bei Fokus/Tipp).
- Abstand unten für feste Leisten und die Home-Leiste (`env(safe-area-inset-bottom)`).

## Begriffe

Die Oberfläche spricht wie eine Privatbank, die API behält ihre Namen. Wo das Spiel anders heißt:

| Oberfläche | Spiel / API |
| --- | --- |
| Meine Organisation | Mein Imperium (`/empire`, `…/companiesbyempireshare`) |

## Regeln

1. **Ein Messing-Button pro Bildschirm.** Nur die Hauptaktion (z. B. „Kaufen“) ist mit `brass` gefüllt, Label in `on-brass`. Alle anderen Buttons sind umrandet: `border` in `line-control`, Text `text-primary`, Hover `bg-raised`.
2. **Gewinn/Verlust nur für Kursbewegungen und Fehler.** Nie für Deko, Navigation, Kategorien oder Diagrammreihen.
3. **Nie nur über Farbe.** Kursrichtung immer mit ▲ / ▼ und Vorzeichen: `▲ +2,34 %`, `▼ −1,12 %`, `± 0,00 %`.
4. **Kurszettel in Listen, Etikett für Einzelwerte.** In Listen und Tabellen steht die Kursveränderung als farbiger Text ohne Fläche, wie im Wirtschaftsteil. Nur wichtige Einzelwerte neben einer großen Zahl (z. B. Tagesperformance des Depots) bekommen ein Etikett: `gain` auf `gain-tint` bzw. `loss` auf `loss-tint`, Ecken `radius-sm`. Komponente: `PriceChange`.
5. **Messing-Tönung ist Belohnung.** `brass-tint` mit `reward-text` ausschließlich für Highscore-Plätze, Erfolge und AlphaCoin-Belohnungen – nicht für Hinweise, Werbung oder den Goldzugang (der ist ein Kauf, keine Belohnung, und wird neutral gekennzeichnet).
6. **Zeitungs-Anmutung.** Hauptüberschrift (`display`) mit `rule` (2px) in `brass` darunter. Listen mit `hairline` (0,5px) in `line` statt einzelner Karten pro Zeile.
7. **Flat Design.** Keine Verläufe, kein Glow, keine starken Schatten.

## Beispiel: eine Depotzeile

Als Komponente: `StockRow` in einer `Card` mit `flush`. (Namen in den Beispielen sind erfunden.)

```
Hanse Reederei AG        HRD      48,72 €     ▲ +2,34 %
stock-name / text-primary  label / text-secondary  figure / text-primary  change / gain
──────────────────────── hairline · line ────────────────────────
```

## Barrierefreiheit – geprüfte Kontraste

- `text-primary` und `text-secondary` bestehen 4,5:1 auf allen drei Flächen.
- `on-brass` auf allen drei Messingstufen ≥ 5,9:1; `reward-text` auf `brass-tint` 8,7:1.
- `gain` / `loss` bestehen auf `bg-card` und ihren getönten Flächen (≥ 5,2:1), in beiden Modi.
- `text-muted` besteht jetzt 4,5:1 auf allen drei Flächen (6,1 / 5,3 / 4,5:1) und darf für echte, kleine Texte verwendet werden: Platzhalter, Fußnoten, Diagramm-Nebenbeschriftungen. `text-secondary` wurde leicht mit angehoben (7,7 / 6,7 / 5,7:1), damit die Stufen unterscheidbar bleiben.
- **Deaktiviertes** nutzt `text-disabled` (3,6:1 auf `bg-card`). WCAG nimmt deaktivierte Elemente aus; der Grund der Sperre steht immer lesbar daneben („Nur mit Goldzugang“).
- **Ränder von Bedienelementen** (umrandete Buttons, Felder, Select, SegmentedControl, Checkbox, Radio, Switch) in `line-control`: 3,1:1 auf `bg-card`, 3,6:1 auf `bg-page` (WCAG 1.4.11). `line-strong` bleibt für rein gliedernde Linien (Tabellenköpfe, Summen, Panel- und Menürahmen, Achsen) und trägt keine Information allein.
- **Hinweis:** `gain` und `loss` unterscheiden sich im Standardmodus kaum in der Helligkeit – Regel 3 (Pfeil + Vorzeichen) ist deshalb Pflicht, nicht Kür.
- Die Diagrammpalette besteht den Test auf Farbfehlsichtigkeit (schwächstes Nachbarpaar ΔE 8,9, normales Sehen ≥ 23, Kontrast ≥ 3:1), Details im Abschnitt „Diagramme mit Plotly“.
- Farbenblind-Modus hat eigene getönte Flächen: `gain-tint` Blauton #1A2E44 (Blau darauf 6,5:1), `loss-tint` Orangebraun #3A2515 (Orange darauf 6,3:1).

## Noch nicht festgelegt

Abstände (`space-*`), Radien (`radius-*`) und die Schriftgrößen sind ein erster Vorschlag, passend zur Zeitungs-Anmutung (fast eckig, 4px-Raster). Wortmarke (`Wordmark`, Siegel mit α) und Icon-Satz (`Icon`) sind eigene Zeichnungen für diese Oberfläche und ersetzen nicht das Logo des Spiels; die Fußzeile (`AppFooter`) weist darauf hin, dass die Oberfläche inoffiziell ist.
