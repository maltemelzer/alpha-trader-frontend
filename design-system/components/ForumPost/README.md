Ein Beitrag im Zeitungsstil: Autorzeile oben, darunter der Text, dann Aktionen. Beiträge werden durch Haarlinien getrennt, nicht durch Karten.

## Aufbau
- **Autorzeile:** Kreis mit Kürzel (36px), Name fett, Rang-Medaille (`RankBadge`), Kennzeichen „Themenstarter“ oder „Moderation“ als umrandetes Etikett. Darunter Allianz und Beitragszahl. Rechts Zeit und Beitragsnummer (#12) in Mono.
- **Text:** 15px/24px, höchstens 72 Zeichen breit, eingerückt auf Höhe des Namens. Der erste Beitrag (`op`) etwas größer (16px/26px).
- **Formatierung** (`text`): `**fett**`, `*kursiv*`, `> Zitat`, `- Liste`, Absätze durch Leerzeile, `$HRD` wird zur Ticker-Erwähnung mit Kursveränderung, `#STSN3G03LB` (volle ASIN) ebenso – verlinkt, wenn `tickers` ein `href` dafür hat. Kein HTML.
- **Zitat** (`quote`): 2px-Linie in `line-strong` links, Text in `text-secondary`, darüber „Name schrieb in #1:“.
- **Einbettungen:** `stocks` als `StockEmbed` (Name, Ticker, Sparkline, Kurs, Veränderung), `trade` als `TradeShare` wie im Chat.
- **Aktionen:** „Hilfreich“ mit Zähler, „Zitieren“, „Antworten“ als Ghost-Buttons. Bearbeitet-Hinweis in `text-muted`.

## Hilfreich
- Nur positiv – es gibt kein „nicht hilfreich“. Umschalter mit `aria-pressed`.
- Aus: leeres Quadrat, `text-secondary`. An: gefülltes Quadrat, `text-primary`, Rahmen `line-strong`. **Kein Messing, kein Grün**: Hilfreich ist keine Belohnung des Spiels und keine Kursbewegung. Wer viele Hilfreich-Stimmen sammelt, bekommt dafür ein `Achievement` – dort ist Messing richtig.

## Regeln
1. Keine Signaturen, keine Bilder im Text. Aktien und Trades werden eingebettet, nicht als Screenshot.
2. Kursveränderungen erscheinen nur über `$TICKER`, `StockEmbed` und `TradeShare` – so sind sie immer aktuell und immer mit ▲/▼.
3. Moderationshinweise nicht rot färben.

## Verwendung
```jsx
const { ForumPost } = window.Bankiersgruen;

<ForumPost number={2} time="Heute, 10:31" tickers={tickers}
  author={{ name: 'Börsenfuchs_77', rank: 2, alliance: 'Nordbund', posts: 3410 }}
  quote={{ author: 'Frieda Kontor', number: 1, text: 'Ist das Plus schon eingepreist?' }}
  text={'Zum Teil. Ich würde ein **Limit** knapp unter 48 € legen, wie bei $NBH.'}
  stocks={[{ name: 'Hanse Reederei AG', ticker: 'HRD', price: 48.72, change: 2.34, spark: [...] }]}
  helpful={{ count: 22, active: voted, onToggle: vote }}
  onQuote={quote} onReply={reply} />
```

## Barrierefreiheit
- Jeder Beitrag ist ein `article`, benannt nach dem Autor. Der Link auf #12 heißt „Link zu Beitrag 12“.
- Die Rang-Medaille nennt „Platz 2“ für Screenreader.
- Text auf `bg-page` 13,6:1, Zitat in `text-secondary` 7,0:1.
