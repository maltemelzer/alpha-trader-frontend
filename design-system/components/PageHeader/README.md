Seitenkopf wie eine Zeitungsseite: Rubrik, große Überschrift mit 2px-Messing-Linie darunter (Regel 6), Unterzeile, rechts Kurs und Aktionen, darunter optional Reiter.

## Aufbau

| Teil | Prop | Stil |
| --- | --- | --- |
| Rubrik | `eyebrow` | Versalien `text-secondary`; Links darin unterstreichen sich beim Hover in Messing – dient auch als Brotkrumen („Markt · Aktien“) |
| Überschrift | `title` | Serif 40px (`size="md"`: 28px), 2px-Linie in `brass` darunter, so breit wie der Text |
| Unterzeile | `meta` | Versalien, z. B. „STHANSEREE · Aktie · CEO Frieda Kontor · Stand 17:35 Uhr“ |
| Erklärung | `description` | 15px `text-secondary`, höchstens zwei Sätze |
| Rechts | `aside` | z. B. Kurs in `figure-lg` mit `PriceChange` als Etikett |
| Aktionen | `actions` | Knöpfe; höchstens einer `primary` |
| Reiter | `tabs` | `Tabs` direkt unter dem Kopf |

## Größen

- `lg` (Standard): Hauptseiten und Aktienseiten – die Überschrift ist die `display`-Schrift.
- `md`: Unterseiten („Depot · Dividenden“), Einstellungen.
- Auf Handys wird die Überschrift kleiner, Aktionen stehen unter dem Titel in voller Breite.

## Regeln

1. **Eine Seitenüberschrift pro Seite**, immer als `h1`.
2. **Die Messing-Linie gibt es nur hier** (und in Dialogen) – sie markiert „das ist die Seite“.
3. **Der Messing-Knopf im Kopf ist die Hauptaktion der Seite** (z. B. „Kaufen“ auf der Aktienseite); dann gibt es weiter unten keinen zweiten (Regel 1).
4. **Kurs rechts nur auf Aktienseiten.** Auf anderen Seiten bleibt `aside` leer oder zeigt eine Kennzahl.

## Verwendung

```jsx
const { PageHeader, PriceChange, Button, Tabs } = window.Bankiersgruen;

<PageHeader
  eyebrow={<><a href="/markt">Markt</a> · <a href="/markt/aktien">Aktien</a></>}
  title="Hanse Reederei AG"
  meta={<><span>STHANSEREE</span><span>Aktie</span><span>CEO Frieda Kontor</span></>}
  aside={<><span className="figure-lg">48,72 €</span><PriceChange value={2.34} variant="tag" size="lg" suffix="heute" /></>}
  actions={<><Button iconStart="+">Zur Watchlist</Button><Button variant="primary">Kaufen</Button></>}
  tabs={<Tabs aria-label="Aktie" items={…} />} />

<PageHeader size="md" eyebrow="Markt" title="Kapitalmaßnahmen" description="Laufende Kapitalerhöhungen, Herabsetzungen und Gewinnausschüttungen." />
```

## Barrierefreiheit

- Die Überschrift ist `h1` (mit `as="h2"` änderbar), die Rubrik steht davor im Lesefluss.
- Überschrift 13,7:1, Rubrik und Unterzeile 7,0:1 auf `bg-page`.
- Der Aufrufer liefert: `title`, bei Aktienseiten Kurs und Veränderung in `aside`.
