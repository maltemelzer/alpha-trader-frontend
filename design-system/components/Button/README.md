Buttons lösen Aktionen aus; Messing (`primary`) gibt es höchstens einmal pro Bildschirm, alle anderen Buttons sind umrandet.

## Varianten

| Variante | Aussehen | Wofür |
| --- | --- | --- |
| `primary` | Messing gefüllt, Text `on-brass` | Die eine Hauptaktion des Bildschirms: „Kaufen“, „Order aufgeben“, „Spiel beitreten“. |
| `secondary` (Standard) | Rahmen `line-control`, Text `text-primary`, Hover `bg-raised` | Alle weiteren Aktionen: „Verkaufen“, „Abbrechen“, „Details“. |
| `ghost` | nur Text `text-secondary`, Hover `bg-raised` | Nebenaktionen in Listen, Karten und Tabellen: „Zur Watchlist“, „Mehr anzeigen“. |
| `danger` | Rahmen und Text `loss`, Hover `loss-tint` | Nur destruktive, nicht umkehrbare Aktionen: „Order stornieren“, „Depot zurücksetzen“. |

## Größen

- `sm` 28px – in Tabellenzeilen und dichten Listen.
- `md` 36px – Standard.
- `lg` 44px – Order-Maske, Dialoge, mobile Ansichten (Touch-Ziel).

## Zustände

- **Hover / Gedrückt:** Messing wird `brass-hover` bzw. `brass-pressed`; umrandete Buttons bekommen `bg-raised` bzw. `line` als Fläche.
- **Fokus (Tastatur):** 2px-Ring in `brass` (`rule`) mit 2px Abstand, für alle Varianten gleich.
- **Deaktiviert:** Text `text-disabled`, Rahmen `line`; der Primär-Button wird zur Fläche `bg-raised`. Keine Transparenz.
- **Lädt (`loading`):** Spinner statt Icon, Button ist gesperrt, `aria-busy="true"`. Das Label bleibt stehen („Order wird gesendet“).

## Regeln

1. **Ein Messing-Button pro Bildschirm** (Regel 1). Gibt es zwei gleich wichtige Aktionen, ist keine davon primär.
2. **Kaufen und Verkaufen sind keine Farben.** „Verkaufen“ ist nicht rot und „Kaufen“ nicht grün. Gewinn/Verlust-Farben bleiben Kursbewegungen vorbehalten (Regel 2). Auf der Verkaufsmaske ist „Verkaufen“ der Messing-Button.
3. **Labels sind Verben**, kurz, im Satzanfang groß: „Kaufen“, „Order aufgeben“, „Zur Watchlist“. Keine Versalien, kein „OK“.
4. **Reihenfolge:** Die Hauptaktion steht rechts, „Abbrechen“ links daneben als `secondary`.
5. **Icons** nur ergänzend (`iconStart`/`iconEnd`), nie ein Button nur mit Icon ohne `aria-label`.

## Verwendung

```jsx
const { Button } = window.Bankiersgruen;

<Button variant="primary" size="lg">Kaufen</Button>
<Button>Verkaufen</Button>
<Button variant="ghost" iconStart="+">Zur Watchlist</Button>
<Button variant="danger">Order stornieren</Button>
<Button variant="primary" loading>Order wird gesendet</Button>
```

## Barrierefreiheit

- Label auf Messing: `on-brass` 8,3:1 (normal), 10,0:1 (Hover), 5,9:1 (gedrückt).
- Umrandeter Button: Text 11,8:1 auf `bg-card`, Rahmen `line-control` 3,1:1.
- `danger`: Text `loss` 5,4:1 auf `bg-card`.
- Fokus-Ring `brass`: 7,0:1 auf `bg-card`.
- Der Aufrufer liefert: das Label, bei reinen Icon-Buttons ein `aria-label`, bei Formularen `type="submit"`.
