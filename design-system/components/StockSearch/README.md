Aktiensuche mit Vorschlägen beim Tippen: Name, Ticker, Kurs und Tagesveränderung; per Tastatur bedienbar und mit „/“ von überall erreichbar.

## Aufbau

- **Feld:** wie `Input`, links eine gezeichnete Lupe, rechts der Tastenhinweis „/“, solange das Feld leer ist.
- **Vorschläge:** Liste unter dem Feld in `bg-card` mit Haarlinien. Pro Treffer: Name in der Serifenschrift, darunter Ticker und Zusatz (Branche · Börse), rechts Kurs in Monospace und Veränderung als Kurszettel.
- **Breite der Liste:** mindestens so breit wie das Feld, sonst so breit wie der längste Name, höchstens 480 px (nie breiter als der Bildschirm). Ein schmales Feld in der Kopfleiste zeigt Namen trotzdem ganz. Am rechten Rand `align="end"`: Die Liste steht rechtsbündig und wächst nach links.
- **Spalten nur mit Inhalt:** Ohne `change` entfällt die Spalte der Veränderung, der Name bekommt den Platz.
- **Treffer im Text:** Der gesuchte Teil ist mit einer 2px-Messing-Unterstreichung markiert, nicht farbig hinterlegt.
- **Aktiver Treffer:** Fläche `bg-raised` mit Messing-Linie links (wie im Navigations-Ausklapper).
- **Leer:** „Keine Aktie zu „xyz“ gefunden.“ – **Laden:** „Suche läuft …“.
- Optional eine Fußzeile mit Tastenhinweisen.

## Verhalten

- Tippen öffnet die Liste. Pfeil hoch/runter wählt, Enter öffnet den Treffer, Escape schließt (zweites Escape leert das Feld).
- Die Komponente sucht nicht selbst: `onChange` liefert den Suchtext, der Aufrufer lädt die Treffer und gibt sie als `results` zurück.
- Mit `shortcut="/"` springt der Fokus von überall auf der Seite in die Suche.

## Regeln

1. **Höchstens 8 Treffer**, beste zuerst (Ticker-Treffer vor Namens-Treffern).
2. **Ein Treffer führt zur Aktienseite**, nicht direkt zur Order.
3. **Suche gehört in die Kopfleiste** (rechts neben der Navigation) und auf die Seite „Markt · Aktien“.

## Verwendung

```jsx
const { StockSearch } = window.Bankiersgruen;

<StockSearch value={q} onChange={setQ} results={hits} loading={loading} shortcut="/" align="end"
  onSelect={r => navigate(`/aktie/${r.ticker}`)}
  footer="↑ ↓ wählen · Enter öffnen · Esc schließen" />
```

## Barrierefreiheit

- Muster „Combobox mit Liste“: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`; Treffer als `role="option"`.
- Die Anzahl der Treffer wird angesagt („3 Treffer“).
- Der Aufrufer liefert: `results` passend zum Suchtext und `onSelect`.
