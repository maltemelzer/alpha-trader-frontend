Highscore-Platz als kleine Messing-Medaille mit der Platzzahl, optional mit der Kategorie als Text daneben – dieselbe Medaille wie bei den Erfolgen, damit alle Belohnungen eine Form haben.

## Aufbau

- **Medaille:** Kreis mit 2px-Ring in `brass` und feinem Innenring, Fläche `bg-page`. Darin der Platz in Monospace. Ohne `rank` steht dort `symbol` (oder der Anfangsbuchstabe von `label`) in der Serifenschrift – etwa für einen Titel wie „Banker“.
- **Text** (`label`): daneben in Versalien, Farbe `reward-text` („BUCHWERT“). Mit `showLabel={false}` nur die Medaille.
- Größen: `sm` 24px (Tabellen, Listen, ohne Innenring), `md` 30px (Standard), `lg` 40px (Profilkopf). Drei- und vierstellige Plätze werden automatisch kleiner gesetzt.

## Regeln

1. **Nur für Highscore-Plätze und Titel** (Regel 5). Nicht für Status („Offen“, „Ausgeführt“), Kategorien oder Zähler.
2. **Alle Plätze sehen gleich aus.** Keine eigenen Farben für Platz 1, 2, 3 – die Zahl sagt die Stufe. So bleibt Messing die einzige Belohnungsfarbe.
3. **In `HighscoreTable` nur für die Plätze 1–3**, ab Platz 4 steht die Zahl ohne Medaille. Im Profilkopf der beste Platz eines Spielers mit Kategorie.
4. **Neben Namen in Chat und Forum** ohne Text (`size="sm"`).

## Verwendung

```jsx
const { RankBadge } = window.Bankiersgruen;

<RankBadge rank={3} />                                  // Medaille „3“
<RankBadge rank={3} label="Buchwert" size="lg" />       // Medaille „3“ + BUCHWERT
<RankBadge symbol="B" label="Banker" />                 // Titel ohne Platz
<RankBadge rank={1} size="sm" />                        // neben dem Namen im Chat
```

## Barrierefreiheit

- Ring und Zahl in `brass` auf `bg-page` 8,1:1; Text `reward-text` 9,8:1 auf `bg-page`, 8,4:1 auf `bg-card`.
- Screenreader lesen „Platz 3, Buchwert“.
