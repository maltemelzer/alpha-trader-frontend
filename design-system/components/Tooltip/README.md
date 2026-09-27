Kurze Erklärung, die bei Hover oder Tastaturfokus erscheint. `Term` ist die fertige Variante für Fachbegriffe aus dem Spiel.

## Aufbau

- Blase in `text-primary` mit Text in `bg-page` (umgekehrte Fläche statt Schatten – flach, Regel 7). Max. 280 px breit, 13 px Text, optional fetter Titel.
- Oben über dem Auslöser; bei wenig Platz oben automatisch darunter, am Rand links/rechts bündig (Pfeil zeigt weiter auf den Auslöser).
- Die Blase hängt per Portal an `document.body` und steht mit `position: fixed` am Auslöser. Scrollende Tabellen, Karten mit `overflow` und Sheets schneiden sie deshalb nicht ab. Beim Scrollen oder Ändern der Fenstergröße schließt sie.
- `Term`: Begriff mit gepunkteter Unterstreichung, Mauszeiger „Hilfe“.

## Glossar

`GLOSSARY` enthält die Begriffe, die Neulinge im Spiel am häufigsten stolpern lassen: `ASIN`, `SPREAD`, `BID` (Geld), `ASK` (Brief), `MARKET`, `LIMIT`, `OTC`, `BOOK_VALUE`, `NET_CASH`, `CASH_FLOW`, `RESERVES`, `REPO`, `SUBSCRIPTION_RIGHT`, `FREE_FLOAT`, `MARKET_MAKER`, `MINER`, `GOLD`, `ABSTENTION`. Eigene Begriffe mit `title` + `definition`.

## Regeln

1. **Nur Zusatzwissen.** Was man zum Handeln braucht (Fehler, Preise, Pflichtangaben), gehört sichtbar auf die Seite, nicht in einen Tooltip.
2. **Nichts Anklickbares im Tooltip.** Links oder Knöpfe → `DropdownMenu` oder `Dialog`.
3. Einen Begriff pro Abschnitt nur beim ersten Vorkommen als `Term` markieren.
4. Zahlen-Tooltips (voller Wert zu „2,52 Mrd. €“) macht `Amount` selbst – mit derselben Blase (`decorative`, weil der volle Wert schon als Screenreader-Text dasteht), per Hover oder Antippen.

## Verwendung

```jsx
const { Term, Tooltip } = window.Bankiersgruen;
<p>Die <Term term="SUBSCRIPTION_RIGHT" /> laufen noch 28 Stunden.</p>
<Term title="Stündliche Änderung" definition="Das Limit ändert sich jede Stunde um diesen Prozentsatz.">Änderung/Std.</Term>
<Tooltip content="Nur mit Goldzugang"><button aria-label="Hilfe">?</button></Tooltip>
```

## Barrierefreiheit

- Blase hat `role="tooltip"` und hängt per `aria-describedby` am Auslöser; erscheint auch bei Tastaturfokus, Escape schließt.
- `Term` ist per Tab erreichbar (`tabIndex=0`). Auf Touch-Geräten öffnet Antippen den Fokus und damit die Erklärung.
- Bei „Bewegung reduzieren“ ohne Überblendung.
