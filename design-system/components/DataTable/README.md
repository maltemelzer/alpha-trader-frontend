Tabelle für Kurslisten, Depot und Ranglisten im Zeitungssatz: Haarlinien statt Gitter, Zahlen rechtsbündig in Monospace, sortierbare Spalten.

## Wann Tabelle, wann StockRow?

| Situation | Komponente |
| --- | --- |
| Bis ca. 10 Aktien, nur Kurs und Veränderung, auch in schmalen Karten | `StockRow` in einer `.bnk-list` |
| Mehr Spalten (Volumen, Stückzahl, Börsenwert), Sortieren, Summenzeile | `DataTable` |

## Aufbau

- **Kopfzeile:** Spaltenköpfe in `label` (Versalien, `text-secondary`), darunter eine 1px-Linie in `line-strong`.
- **Zeilen:** 12px Abstand oben und unten (`density="sm"`: 8px), dazwischen Haarlinien in `line`. Keine Zebrastreifen, keine senkrechten Linien.
- **Spaltentypen** (`type`) übernehmen Format und Ausrichtung:
  - `stock`: Name in der Serifenschrift, darunter Ticker oder Zusatz
  - `currency`: „48,72 €“
  - `number`: „3.905.000 Stk.“, mit `unit` und `decimals`
  - `percent`: „12,40 %“
  - `change`: `PriceChange` als Kurszettel, mit `amountKey` auch „▲ +644,80 € (+12,40 %)“
  - `sparkline`: Mini-Kursverlauf aus einer Zahlenreihe, optional mit `baselineKey` (Vortagesschluss); sortiert nach Veränderung im Zeitraum
- **Summenzeile** (`summary`): oben eine 1px-Linie in `line-strong`, Label „Gesamt“ in Versalien, Werte halbfett.
- **Leer:** zentrierter Hinweis in `text-secondary`, z. B. „Noch keine Positionen – kaufen Sie Ihre erste Aktie.“

## Sortieren

- Sortierbare Spalten (`sortable`) haben einen Knopf im Kopf. Das Symbol ↕ steht für sortierbar, ↑ / ↓ für die aktive Richtung (in `brass`).
- Bewusst **↑ ↓ statt ▲ ▼**: Die gefüllten Dreiecke gehören der Kursrichtung (Regel 3) und dürfen nicht doppelt belegt werden.
- Erster Klick: Zahlen absteigend (größte zuerst), Text aufsteigend (A–Z). Zweiter Klick dreht um.
- Unkontrolliert mit `defaultSort` oder kontrolliert mit `sort` + `onSortChange` (z. B. Sortierung auf dem Server).

## Zustände

- **Klickbare Zeilen** (`getRowHref` oder `onRowClick`): Hover `bg-raised`. Die erste Zelle wird zum Link, der die ganze Zeile abdeckt, damit die Tastatur mit einem Tab-Halt pro Zeile auskommt. Fokus-Ring in `brass`.
- **Hervorgehobene Zeile** (`isRowHighlighted`): `brass-tint`, Name in `reward-text`. Nur für den eigenen Platz in Ranglisten oder eine gerade erreichte Belohnung (Regel 5), höchstens eine Zeile.
- **Schmale Bildschirme:** Die Tabelle scrollt waagerecht; mit `sticky` bleibt die erste Spalte stehen.

## Regeln

1. **Tabellen stehen in einer `Card` mit `flush`**, der Kartentitel ist die Überschrift.
2. **Veränderung immer als Kurszettel**, nie als Etikett (Regel 4).
3. **Wichtigste Spalte links, Zahlen rechts.** Reihenfolge in Kurslisten: Titel · Kurs · Veränderung · weitere Kennzahlen.
4. **Keine Buttons in Zeilen.** Aktionen gehören auf die Detailseite der Aktie.
5. **Einheiten in die Zelle, nicht in den Kopf**, wenn sie sich unterscheiden („Stk.“, „Mrd. €“). Gleiche Einheit für die ganze Spalte darf in den Kopf.

## Verwendung

```jsx
const { Card, DataTable } = window.Bankiersgruen;

<Card title="Marktübersicht" flush>
  <DataTable caption="Marktübersicht" rowKey="ticker" rows={rows}
    defaultSort={{ key: 'chg', dir: 'desc' }}
    getRowHref={r => `/aktie/${r.ticker}`}
    columns={[
      { key: 'stock', label: 'Titel', type: 'stock', sortable: true, sticky: true },  // stock: { name, ticker }
      { key: 'price', label: 'Kurs', type: 'currency', sortable: true },
      { key: 'chg',   label: 'Heute', type: 'change', sortable: true },
      { key: 'vol',   label: 'Volumen', type: 'number', unit: 'Stk.', sortable: true },
    ]} />
</Card>

<DataTable density="sm" rows={depot}
  columns={[ …, { key: 'pl', label: 'Seit Kauf', type: 'change', amountKey: 'plAmt' } ]}
  summary={{ stock: 'Gesamt', value: 17450.40, pl: 4.83, plAmt: 812.60 }} />
```

## Barrierefreiheit

- Echte `<table>` mit `scope`: erste Zelle jeder Zeile ist Zeilenkopf, Spaltenköpfe setzen `aria-sort`.
- `caption` beschriftet die Tabelle für Screenreader, ohne sichtbar zu sein.
- Kopf 6,1:1, Zellen 11,8:1 auf `bg-card`; auf Hover (`bg-raised`) 10,1:1. Hervorgehobene Zeile: `reward-text` 8,7:1 auf `brass-tint`.
- Der Aufrufer liefert: Zahlen als Zahlen (nicht als formatierten Text), damit Sortierung und Format stimmen; `rowKey` für stabile Zeilen.


## Handy (`stack="auto"`)

Unter 600 px **Containerbreite** (Container Query, nicht Fensterbreite) wird jede Zeile zur Karte:

- Die Titelspalte (erste Spalte oder `mobile: 'title'`) steht oben über die volle Breite.
- Alle anderen Werte stehen in drei Spalten, jeweils mit kleiner Beschriftung darüber (`mobileLabel`, sonst der Text des Spaltenkopfs). Lange Zahlen mit `mobileWide` über zwei Spalten.
- Aktionsspalten (`action: true`, z. B. Menü „Handeln“) wandern oben rechts in die Karte.
- Unwichtige Spalten mit `mobile: false` ausblenden.
- Die Sortierung wandert in eine Auswahl „Sortieren“ über der Liste.
- Summenzeile wird zur letzten Karte.

Ohne `stack` scrollt die Tabelle waagerecht, die erste Spalte bleibt mit `sticky` stehen – gut für schmale Tabellen mit bis zu vier Spalten (Kurszettel, Highscore). Alle Tabellen der Organisation, Anleihen, Indizes, Optionsscheine, Anstellungen und Kontoauszug nutzen `stack="auto"`.
