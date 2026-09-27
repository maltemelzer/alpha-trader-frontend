Kopfleiste des Spiels im Stil eines Zeitungskopfs: Wortmarke in der Serifenschrift, Hauptnavigation mit aufklappbaren Unterpunkten, rechts Buchwert, Bargeld und Spieler; auf schmalen Bildschirmen ein Menü.

## Aufbau

| Bereich | Inhalt | Stil |
| --- | --- | --- |
| Wortmarke | Name des Spiels, „Alpha-Trader“ (`brand`), optional Datumszeile (`dateline`, z. B. „Mi., 24. Sept. · 06:50 Uhr“) | Serif 22px / `label` in `text-secondary` |
| Navigation | 4 bis 6 Hauptbereiche (`items`), optional Zähler (`badge`, z. B. offene Orders – helles Schild wie an der Glocke, damit Ungelesenes auffällt) | 14px halbfett, `text-secondary`; aktiv `text-primary` mit 2px-Linie in `brass` |
| Rechts (`meta`) | `HeaderStat` für Buchwert und Bargeld (Zahlen werden ab 1 Mrd. gekürzt), `PlayerMenu` | Label in Versalien über Monospace-Wert |

- Fläche `bg-page`, unten eine Haarlinie in `line-strong`, Höhe 56px. Kein Schatten, keine eigene Farbfläche.
- Die aktive Seite trägt dieselbe Messing-Linie wie der gewählte `SegmentedControl` und die aktiven `Tabs`: eine Sprache für „hier bist du“.

## Unterpunkte: Hauptbereiche klappen senkrecht auf

Hat ein Hauptbereich `children`, wird er zum Ausklapper (Winkel ⌄ hinter dem Label):

- **Klick** öffnet unter dem Eintrag eine senkrechte Liste in `bg-card` mit Haarlinien, Rahmen `line-strong`, unten `radius-md`. Kein Schatten.
- Unterpunkte stehen in der Serifenschrift wie Rubriken, optional mit einer Zeile Erklärung (`description`) und einem Zähler (`badge`).
- **Aktiver Unterpunkt:** Messing-Linie links. Der Hauptbereich darüber bekommt dann ebenfalls seine Messing-Linie, damit man von oben sieht, wo man ist.
- **Schließen:** Klick auf einen Unterpunkt, Klick daneben, Escape, oder erneuter Klick auf den Hauptbereich. Es ist immer nur ein Ausklapper offen.
- **Tastatur:** Pfeil nach unten auf dem Hauptbereich öffnet und springt in die Liste, Pfeil hoch/runter bewegt sich darin, Escape zurück zum Hauptbereich.
- **Mobil:** Im Menü werden Hauptbereiche mit Unterpunkten zum Akkordeon. Der Bereich mit der aktiven Seite ist schon aufgeklappt.
- Als Pfeil dient ein gezeichneter Winkel, bewusst kein ▲▼ (die gehören der Kursrichtung, Regel 3). Dasselbe gilt jetzt auch für `Select`.

**Warum Klick und nicht Hover?** Hover-Menüs klappen beim Überfahren versehentlich auf, funktionieren auf Touch-Geräten nicht und verlangen eine ruhige Hand. Ein Klick ist eindeutig und auf allen Geräten gleich.

**Faustregeln:** 5 bis 6 Hauptbereiche, je 2 bis 7 Unterpunkte. Ein Hauptbereich mit Unterpunkten ist selbst kein Link. Seine Startseite ist der erste Unterpunkt („Übersicht“). Einzelne Seiten ohne Unterpunkte (Orders, Nachrichten) bleiben direkte Links.

## Verhalten bei wenig Platz

Die Kopfleiste reagiert auf ihre eigene Breite, nicht auf die Fenstergröße:

1. unter 1240px fällt die Datumszeile weg,
2. unter 1080px fallen die Kennzahlen (`HeaderStat`) weg,
3. unter 720px klappt die Navigation in ein **Menü**: Knopf „≡ Menü“ rechts, darunter eine Liste mit Haarlinien in der Serifenschrift, wie ein Inhaltsverzeichnis. Die aktive Seite ist dort mit einer Messing-Linie links markiert. Kennzahlen und das Spieler-Menü (`PlayerMenu variant="inline"`) gehören dann in `menuFooter`.

Mit `collapse="always"` ist das Menü immer aktiv (z. B. in einer App-Hülle), mit `collapse="never"` nie.

**Mit Tab-Leiste (`bottomNav`):** Übergibt man `bottomNav` (Props der `BottomNav`), rendert die Kopfleiste die Tab-Leiste mit. Unter 720 px verschwinden dann Navigation und Menü-Knopf, oben bleiben Wortmarke und `meta` (ohne Kennzahlen), unten steht die Tab-Leiste. Empfohlen für die App auf dem Handy.

## Regeln

1. **Höchstens 6 Hauptbereiche**, kurze Substantive: Markt · Organisation · Orders · Highscores · Community.
2. **Kein Messing-Button in der Kopfleiste.** Die Hauptaktion gehört auf die Seite (Regel 1).
3. **Zähler nur für Dinge, die Aufmerksamkeit brauchen** (offene Orders, ungelesene Nachrichten), in `bg-raised`, nicht in Gewinn-/Verlustfarbe.
4. **Kennzahlen als Kurszettel:** Eine Veränderung steht als Text neben dem Wert, nicht als Etikett.
5. **Highscore-Plätze** als `RankBadge` im `PlayerMenu`, nicht in der Leiste.

## Verwendung

```jsx
const { AppHeader, HeaderStat, PlayerMenu } = window.Bankiersgruen;

const stats = [
  <HeaderStat key="d" label="Buchwert" value={2321581.52} />,
  <HeaderStat key="b" label="Bargeld" value={993113.48} />,
];

<AppHeader brand="Alpha-Trader" brandHref="/" dateline="Mi., 24. Sept. · 06:50 Uhr"
  items={[
    { label: 'Markt', children: [
      { label: 'Wertpapiere', href: '/markt', active: true, description: 'Aktien, Anleihen, Coins, Indizes, Fonds' },
      { label: 'Kapitalmaßnahmen', href: '/markt/kapitalmassnahmen' },
    ] },
    { label: 'Organisation', children: [
      { label: 'Portfolio', href: '/portfolio' },
      { label: 'Unternehmen', href: '/unternehmen' },
    ] },
    { label: 'Orders', href: '/orders', badge: 2 },
    { label: 'Highscores', href: '/highscores' },
    { label: 'Community', href: '/zeitung' },
  ]}
  meta={[...stats, <PlayerMenu key="p" name="CptnIglo" subtitle="Hanseatische Allianz · Gold" items={menu} />]}
  menuFooter={[...stats, <PlayerMenu key="p" variant="inline" name="CptnIglo" subtitle="Hanseatische Allianz · Gold" items={menu} />]}
  renderLink={(item, props, children) => <RouterLink to={item.href} {...props}>{children}</RouterLink>} />
```

## Barrierefreiheit

- `<header>` mit `<nav aria-label="Hauptnavigation">`; die aktive Seite hat `aria-current="page"`.
- Menü-Knopf und Ausklapper sind Buttons mit `aria-expanded` und `aria-controls`; geschlossene Listen sind `hidden`.
- Links 7,0:1 (`text-secondary`) bzw. 13,7:1 (aktiv) auf `bg-page`; Fokus-Ring in `brass`.
- Der Aufrufer liefert: `brand`, die Einträge mit `href` und `active`, bei Client-Routing `renderLink` oder `onNavigate`.
