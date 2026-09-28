Die Themen eines Bereichs: Titel, Autor, erwähnte Aktien, Antworten, Aufrufe und letzte Antwort. Angepinnte Themen stehen oben, getrennt durch eine kräftigere Linie.

## Aufbau
- Titel in der Serifenschrift, 16px. **Ungelesen:** fett mit „Neu“ oder „8 neu“ in `text-primary`. Gelesen: normales Gewicht.
- Darunter: „von Name · Zeit“ und die Aktien als `TickerMention` (ohne Kursveränderung, damit die Liste ruhig bleibt).
- Kennzeichen über dem Titel in `label`: **Angepinnt** (Reißzwecke) und **Geschlossen** (Schloss), beide mit CSS gezeichnet, in `text-secondary`. Geschlossene Titel in `text-secondary`.
- Zahlen rechtsbündig in Mono, Aufrufe gedämpft. Letzte Antwort: Name und Zeit.
- Unter 640px: nur Titel und Metazeile, die Antwortzahl hängt hinten an.

## Regeln
1. Sortierung über `SegmentedControl` (Neueste, Aktivste, Hilfreichste) und Seiten über `Pagination` – beide außerhalb der Liste.
2. Keine Farben für Status: Neu, angepinnt, geschlossen sind Gewicht und Form.
3. Höchstens 3 Ticker pro Zeile; mehr zeigt das Thema selbst.

## Verwendung
```jsx
const { ThreadList, SegmentedControl, Pagination } = window.Bankiersgruen;

<ThreadList tickers={tickers} onSelect={t => open(t.id)} threads={[
  { id: 2, pinned: true, title: 'Sammelthema: Quartalszahlen', author: { name: 'Frieda Kontor' }, time: '12.09.',
    tickers: ['HRD', 'NBH'], replies: 186, views: 4410, unread: 8, last: { author: 'Hanseat_M', time: '17:48' } },
  { id: 3, locked: true, title: 'Gerüchte um Übernahme', author: { name: 'Neuling_42' }, replies: 12, views: 540 }
]} />
<Pagination page={1} pages={12} onChange={setPage} total="642 Themen" />
```

## Barrierefreiheit
- Die Liste ist ein `ul`; der Titel ist Link oder Knopf. Zahlen haben unsichtbare Beschriftungen („Antworten: 24“).
- Die Kopfzeile ist `aria-hidden`.
