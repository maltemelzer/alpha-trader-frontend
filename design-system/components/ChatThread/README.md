Der Verlauf zeigt Nachrichten als Sprechblasen: fremde links auf `bg-raised`, eigene rechts auf `bg-page` mit Haarrahmen.

## Aufbau

- **Blasen:** `radius-md`, die Ecke zur Absenderseite `radius-sm`. Höchstens 72 % der Breite (max. 560px). Text 15px in `text-primary`.
- **Gruppierung:** Aufeinanderfolgende Nachrichten derselben Person rücken zusammen; Kreis mit Kürzel, Name und Rang-Medaille stehen nur an der ersten, die Uhrzeit nur an der letzten.
- **Tagestrenner (`{ day }`):** „Heute“, „Gestern“, Datum – in `label`, mit Haarlinien links und rechts (Regel 6).
- **Systemzeilen (`{ system }`):** zentriert, 13px `text-secondary`, ohne Blase („Paul ist der Allianz beigetreten“).
- **Erwähnung:** `#STHANSEREE` (volle ASIN, 10 Zeichen) im Text wird zu `TickerMention` – Mono, gepunktete Messing-Unterstreichung, verlinkt, optional mit Kursveränderung (▲/▼ und Vorzeichen, Regel 3). Davor darf kein Wortzeichen stehen: „#1“, „#Top“ oder „Super!“ bleiben Text. Alte Nachrichten mit `$STHANSEREE` werden weiter erkannt.
- **Karte (`!STHANSEREE`):** wie `#`, zusätzlich erscheint unter der Blase die Karte aus `renderEmbed(asin)` (meist `AssetCard`, höchstens drei je Nachricht). Karten am Anfang oder Ende der Nachricht stehen nicht noch einmal im Text (mitten im Satz bleiben sie Erwähnung); besteht die Nachricht nur aus Karten, entfällt die Blase. Mit Karte darf die Spalte 92 % statt 72 % breit werden.
- **Geteilter Trade (`trade`):** `TradeShare` in der Blase: Kauf/Verkauf, Stückzahl, Kurs, Veränderung seither. Kauf und Verkauf sind keine Farben.
- **Schreibt-Anzeige (`typing`):** drei Punkte in `text-muted` und Text in `text-secondary`.
- **Status eigener Nachrichten:** „Gesendet“ / „Gelesen“ als Text unter der letzten Blase, keine Häkchen-Farben.

## Regeln

1. **Keine farbigen Blasen.** Eigene Nachrichten sind nicht Messing und nicht grün, sie unterscheiden sich durch Seite und Rahmen.
2. **Farbe nur für Kurse** (Regel 2): Die einzigen farbigen Stellen im Verlauf sind Kursveränderungen.
3. **Namen im Gruppenchat ja, in Direktnachrichten nein** (`showNames={false}`).
4. **Links und Ticker** öffnen das Wertpapier; kein Vorschau-Popup im Verlauf – wer mehr zeigen will, hängt mit `!` eine Karte an.

## Verwendung

```jsx
const { ChatThread, RankBadge, AssetCard } = window.Bankiersgruen;

<ChatThread
  tickers={{ STHANSEREE: { name: 'Hanse Reederei AG', change: 2.34, href: '/wertpapier/STHANSEREE' } }}
  renderEmbed={asin => <AssetCard asin={asin} name="Hanse Reederei AG" price={48.72} change={2.34} spark={prices} />}
  typing="Frieda schreibt …"
  messages={[
    { day: 'Heute' },
    { author: { name: 'Frieda Kontor', badge: <RankBadge rank={1} size="sm" showLeague={false} /> },
      text: 'Ich hab #STHANSEREE nachgekauft. !STHANSEREE', time: '09:14' },
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
