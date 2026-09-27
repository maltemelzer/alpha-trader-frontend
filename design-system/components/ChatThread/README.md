Der Verlauf zeigt Nachrichten als Sprechblasen: fremde links auf `bg-raised`, eigene rechts auf `bg-page` mit Haarrahmen.

## Aufbau

- **Blasen:** `radius-md`, die Ecke zur Absenderseite `radius-sm`. Höchstens 72 % der Breite (max. 560px). Text 15px in `text-primary`.
- **Gruppierung:** Aufeinanderfolgende Nachrichten derselben Person rücken zusammen; Kreis mit Kürzel, Name und Rang-Medaille stehen nur an der ersten, die Uhrzeit nur an der letzten.
- **Tagestrenner (`{ day }`):** „Heute“, „Gestern“, Datum – in `label`, mit Haarlinien links und rechts (Regel 6).
- **Systemzeilen (`{ system }`):** zentriert, 13px `text-secondary`, ohne Blase („Paul ist der Allianz beigetreten“).
- **Ticker-Erwähnung:** `$STHANSEREE` (ASIN) im Text wird zu `TickerMention` – Mono, gepunktete Messing-Unterstreichung, verlinkt, mit Kursveränderung (▲/▼ und Vorzeichen, Regel 3).
- **Geteilter Trade (`trade`):** `TradeShare` in der Blase: Kauf/Verkauf, Stückzahl, Kurs, Veränderung seither. Kauf und Verkauf sind keine Farben.
- **Schreibt-Anzeige (`typing`):** drei Punkte in `text-muted` und Text in `text-secondary`.
- **Status eigener Nachrichten:** „Gesendet“ / „Gelesen“ als Text unter der letzten Blase, keine Häkchen-Farben.

## Regeln

1. **Keine farbigen Blasen.** Eigene Nachrichten sind nicht Messing und nicht grün, sie unterscheiden sich durch Seite und Rahmen.
2. **Farbe nur für Kurse** (Regel 2): Die einzigen farbigen Stellen im Verlauf sind Kursveränderungen.
3. **Namen im Gruppenchat ja, in Direktnachrichten nein** (`showNames={false}`).
4. **Links und Ticker** öffnen die Aktie; kein Vorschau-Popup im Verlauf.

## Verwendung

```jsx
const { ChatThread, RankBadge } = window.Bankiersgruen;

<ChatThread
  tickers={{ HRD: { name: 'Hanse Reederei AG', change: 2.34, href: '/aktie/hrd' } }}
  typing="Frieda schreibt …"
  messages={[
    { day: 'Heute' },
    { author: { name: 'Frieda Kontor', badge: <RankBadge rank={1} size="sm" showLeague={false} /> },
      text: 'Ich hab $HRD nachgekauft.', time: '09:14' },
    { author: { name: 'Frieda Kontor' }, time: '09:14',
      trade: { side: 'buy', status: 'ausgeführt', name: 'Hanse Reederei AG', ticker: 'HRD', qty: 120, price: 47.6, change: 2.35 } },
    { own: true, text: 'Ich bin auch drin.', time: '17:40', status: 'Gelesen' }
  ]} />
```

## Barrierefreiheit

- Der Verlauf ist `role="log"` mit `aria-live="polite"`: neue Nachrichten werden vorgelesen.
- Wo der Name optisch fehlt (eigene Nachrichten, Direktnachrichten), steht er unsichtbar für Screenreader davor („Du:“).
- Blasen: Text auf `bg-raised` 10,6:1, auf `bg-page` 13,6:1. **Offen:** Der Rahmen eigener Blasen (`line-strong`) hat nur ca. 2:1; die Seite trägt die Unterscheidung mit.
- Bei `autoScroll` wird nur nach unten gescrollt, wenn man schon unten war.
