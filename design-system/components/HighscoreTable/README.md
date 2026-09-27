Bestenliste für Nutzer, Unternehmen oder Allianzen in einer Kategorie, gebaut auf `GET /v2/userhighscores`, `/v2/companyhighscores` und `/v2/alliancehighscores`.

## Aufbau
- Spalten: **Platz · Vortag · Name · Wert.** Kopf in `label` über einer 1px-Linie in `line-strong`.
- **Platz 1–3:** `RankBadge` (Messing-Medaille, Regel 5). Ab Platz 4 die Zahl in Mono.
- **Vortag:** Veränderung aus `historyPosition` – „↑ 2“ / „↓ 1“ / „–“ / „neu“. Bewusst **ohne Farbe** und mit anderen Pfeilen als die Kursrichtung (▲▼ gehören Kursen).
- **Name:** Kürzel-Kreis (Nutzer) oder eckiges Feld bzw. `logoUrl` (Unternehmen, Allianzen). Darunter bei Nutzern der Anteil erreichter Erfolge, bei Unternehmen die ASIN.
- **Wert** je Kategorie formatiert: Geldwerte gekürzt ab 1 Mio. („3,04 Brd. €“, voller Wert im Tooltip), Cashflow mit Vorzeichen, Erfolge in %, Miner in Coins/h, Online-Zeit in Minuten, Trades und Chatnachrichten als Anzahl.
- **Eigene Zeile:** `bg-raised`, 3px-Balken links in `text-primary`, Kennzeichen „Sie“ bzw. „Ihres“. Steht die eigene Zeile weit unten, folgt sie nach „…“.
- Unter 520px Breite entfällt die Vortags-Spalte.

## Kategorien (`HIGHSCORE_TYPES`)
| `highscoreType` | Bezeichnung | Wert |
| --- | --- | --- |
| `BOOK_VALUE` | Buchwert | € |
| `NET_CASH` | Net Cash | € |
| `RESERVES` | Zentralbankreserven | € |
| `CASH_FLOW` | Cashflow | € mit Vorzeichen |
| `TRADES` | Trades (10 Tage) | Anzahl |
| `ACHIEVEMENTS` | Erfolge | % |
| `BUILDING` | Immobilien | Größe |
| `MINER` | Miner | Coins/h |
| `CHAT_MESSAGES` | Chatnachrichten (7 Tage) | Anzahl |
| `ONLINE_TIME` | Online-Zeit | Minuten |

## Regeln
1. Art der Liste (Nutzer, Unternehmen, Allianzen) als `SegmentedControl`, Kategorie als `Select`, darunter die Beschreibung der Kategorie und der Stand.
2. Seiten mit `Pagination`; der Platz ergibt sich aus `offset` + Position, wenn die API keinen liefert.
3. Kein Grün/Rot – auch nicht für Cashflow. Das ist keine Kursbewegung.

## Verwendung
```jsx
const { HighscoreTable, HIGHSCORE_TYPES } = window.Bankiersgruen;

const page = await api.get('/v2/userhighscores', { params: { highscoreType: 'BOOK_VALUE', page: 0, size: 10 } });
<HighscoreTable kind="user" type="BOOK_VALUE" entries={page.content} offset={page.number * page.size}
  hrefFor={(e, kind) => kind === 'user' ? `/user/${e.username}` : `/security/${e.securityIdentifier}`} />
```

## Barrierefreiheit
- Geordnete Liste; die eigene Zeile trägt `aria-current`. Medaillen lesen sich „Platz 1“, Bewegung „2 Plätze gewonnen“.
- Gekürzte Beträge haben den vollen Wert für Screenreader.
