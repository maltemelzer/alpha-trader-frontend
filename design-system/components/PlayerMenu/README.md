Spieler-Menü rechts in der Kopfleiste: ein Kreis mit dem Kürzel, per Klick klappen Profil, Erfolge, Einstellungen, Hilfe und Abmelden auf.

## Aufbau

- **Auslöser:** Kreis mit Kürzel (`bg-raised`, Haarlinie `line-strong`), daneben ein Winkel. Hover und geöffnet: Fläche `bg-raised`.
- **Liste:** rechtsbündig unter dem Kürzel, Fläche `bg-card`, Rahmen `line-strong`, Ecken `radius-md`, kein Schatten.
- **Kopf der Liste:** Spielername in der Serifenschrift, darunter Allianz und Goldzugang (`subtitle`) in Versalien.
- **Einträge:** 14px halbfett in `text-secondary`, Hover `text-primary` auf `bg-raised`, optional ein Zähler (z. B. neue Erfolge). Trennlinie mit `{ divider: true }`.

## Varianten

| Variante | Wofür |
| --- | --- |
| `dropdown` (Standard) | In `AppHeader` → `meta`, ganz rechts |
| `inline` | Im mobilen Menü (`AppHeader` → `menuFooter`): dieselben Einträge offen, ohne Ausklapper |

## Regeln

1. **Nur Persönliches:** Profil, Erfolge, Einstellungen, Hilfe, Abmelden. Spielbereiche (Markt, Depot …) gehören in die Hauptnavigation.
2. **„Abmelden“ steht zuletzt**, nach einer Trennlinie, in normaler Farbe. Es ist keine destruktive Aktion, also nicht in `loss`.
3. **Zähler** nur für Neues (z. B. 3 neue Erfolge), in `bg-raised`.
4. **Highscore-Plätze** zeigt man bei Bedarf als Medaille im Kopf: `subtitle={<RankBadge label="Buchwert" rank={3} size="sm" />}`.

## Verwendung

```jsx
const { AppHeader, HeaderStat, PlayerMenu } = window.Bankiersgruen;

const menu = [
  { label: 'Profil', href: '/profil' },
  { label: 'Erfolge', href: '/erfolge', badge: 3 },
  { label: 'Einstellungen', href: '/einstellungen' },
  { label: 'Hilfe', href: '/hilfe' },
  { divider: true },
  { label: 'Abmelden', onClick: logout },
];

<AppHeader …
  meta={[...stats, <PlayerMenu key="p" name="CptnIglo" subtitle="Hanseatische Allianz · Gold" items={menu} />]}
  menuFooter={[...stats, <PlayerMenu key="p" variant="inline" name="CptnIglo" subtitle="Hanseatische Allianz · Gold" items={menu} />]} />
```

## Barrierefreiheit

- Auslöser ist ein Button mit `aria-expanded`, `aria-controls` und `aria-label` („Spieler-Menü: CptnIglo“).
- Tastatur: Pfeil nach unten öffnet und springt in die Liste, Pfeil hoch/runter bewegt sich, Escape schließt und springt zurück; Klick daneben schließt.
- Einträge 6,1:1 auf `bg-card`, Hover 10,1:1; Fokus-Ring in `brass`.
- Der Aufrufer liefert: `name`, die Einträge und für „Abmelden“ ein `onClick` oder `href`.
