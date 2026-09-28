Index-Seite: Eckdaten (`IndexFacts`) und Mitglieder mit Gewichtung (`IndexMembers`).

## IndexFacts

Betreiber · Zusammensetzung („Feste Auswahl“ oder „Nach Regel“ mit der Regel in einem Satz, z. B. „Top 30 Aktien nach Marktkapitalisierung · höchstens 20 % je Wert · Streubesitz ≥ 10 %“) · Mitglieder · Basiswert · Verkettungsfaktor · nächste Verkettung.

## IndexMembers

| Spalte | Inhalt |
| --- | --- |
| Wertpapier | Name, ASIN |
| Anteile | `shares` (im Streubesitz) |
| Kurs | `price` |
| Faktor | `priceAdjustmentFactor`, 1 ohne Nachkommastellen |
| Kapitalisierung | `capitalisation` |
| Gewicht | Anteil an der Summe, mit schmalem Balken (neutral, `text-secondary`) |

## Regeln

1. Indexstände sind Punkte, keine Euro: „125.473.072,8 Pkt.“.
2. Gewichte ohne Farbe – sie sind Anteile, keine Kursbewegung. Unter 0,01 % steht „< 0,01 %“.

## API

- `GET /api/v2/index/{asin}` → `IndexView` (`members: IndexMemberValuesView[]`, `rule: IndexRuleView`, `chainingFactor`, `baseValue`, `nextChainingDate`)
- Liste aller Indizes: `GET /api/v2/indexes` → `CompactIndexView`; eigene: `GET /api/v2/my/indexes`
