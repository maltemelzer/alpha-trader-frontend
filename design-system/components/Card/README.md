Karten sind flache Flächen in `bg-card`, die einen Bereich des Bildschirms gliedern; Inhalte darin werden mit Haarlinien getrennt, nicht mit weiteren Karten.

## Aufbau

- **Kopf (optional):** Rubrik (`eyebrow`, Versalien, `text-secondary`), Titel in der Serifenschrift (`title`, 20px), rechts höchstens eine Nebenaktion (`action`, z. B. ein Ghost-Button in `sm`). Darunter eine Haarlinie in `line`.
- **Inhalt:** 16px Innenabstand (`space-4`). Mit `flush` ohne Abstand, für Listen und Tabellen.
- **Fuß (optional):** Stand, Quelle oder Hinweis, 13px in `text-secondary`, oben eine Haarlinie.
- **Fläche:** `bg-card` auf `bg-page`, Ecken `radius-md`. Kein Rahmen, kein Schatten (Regel 7).

## Varianten

| Variante | Aussehen | Wofür |
| --- | --- | --- |
| `default` | `bg-card` | Alle Bereiche: Depot-Übersicht, Watchlist, Orderbuch, Nachrichten. |
| `reward` | `brass-tint`, Titel in `reward-text`, Rubrik in `brass` | Nur Ränge, Erfolge und Belohnungen (Regel 5). Nie für Hinweise, Werbung oder Warnungen. |

**Füllend (`fill`):** Die Karte nimmt die ganze Höhe ihrer Grid-Zelle ein, Kopf und Fuß bleiben stehen, nur der Inhalt scrollt. Das ist das Mittel für Seiten, die ohne Seiten-Scroll auf einen Bildschirm passen (Orderbuch, Trades, Ranglisten, Chat-Liste). Mit `flush` kombinierbar.

**Klickbar:** Mit `href` wird die ganze Karte ein Link, mit `onClick` ein Button (per Tastatur bedienbar). Hover `bg-raised`, Fokus-Ring in `brass`. Eine klickbare Karte enthält keine weiteren Buttons oder Links, `action` entfällt dann.

## Regeln

1. **Keine Karten in Karten.** Unterteilungen in einer Karte laufen über Haarlinien (`.bnk-list`) oder Zwischenüberschriften in `label`.
2. **Listen statt Kachelwände** (Regel 6): Zehn Aktien sind eine Karte mit zehn Zeilen, nicht zehn Karten.
3. **Eine Nebenaktion im Kopf**, als Ghost-Button. Die Hauptaktion des Bildschirms (Messing) steht nicht im Kartenkopf.
4. **Wichtige Einzelwerte als Etikett** (Regel 4), z. B. die Tagesperformance neben dem Depotwert: `PriceChange variant="tag"`. Listen in Karten nutzen `StockRow`.
5. **Belohnungs-Karten sind selten.** Höchstens eine pro Bildschirm, sonst verliert Messing seine Bedeutung.

## Verwendung

```jsx
const { Card, Button } = window.Bankiersgruen;

<Card eyebrow="Übersicht" title="Ihr Depot"
      action={<Button variant="ghost" size="sm">Details</Button>}
      footer="Stand 17:35 Uhr">
  …Depotwert und <PriceChange variant="tag" />…
</Card>

<Card title="Watchlist" flush>
  <ul className="bnk-list"><StockRow … /><StockRow … /></ul>
</Card>

<Card variant="reward" eyebrow="Erfolg freigeschaltet" title="Erste Dividende">…</Card>

<Card title="Letzte Trades" fill flush>…lange Liste, scrollt in der Karte…</Card>

<Card href="/aktie/hrd" eyebrow="HRD" title="Hanse Reederei AG">…</Card>
```

## Barrierefreiheit

- Text auf `bg-card`: `text-primary` 11,8:1, `text-secondary` 6,1:1.
- Auf `brass-tint`: `text-primary` 12,1:1, `text-secondary` 6,2:1, `brass` 7,2:1, `reward-text` 8,7:1.
- `bg-card` hebt sich von `bg-page` nur leicht ab (1,2:1). Das ist gewollt (flach), die Karte trägt deshalb nie allein eine Bedeutung.
- Der Aufrufer liefert: den Titel (wird zur Überschrift, Ebene über `titleAs`), bei klickbaren Karten einen aussagekräftigen Titel, weil er zum Namen des Links wird.
