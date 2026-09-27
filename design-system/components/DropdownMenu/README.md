Knopf mit aufklappender Liste von Aktionen – „Weitere Aktionen“ zu einem Wertpapier, einer Order oder einem Beitrag.

## Aufbau

- Auslöser ist ein `Button` (`secondary` oder `ghost`) mit Winkel. Liste in `bg-card`, Rahmen `line-strong`, flach.
- Einträge mit optionaler Beschreibung und Zusatzwert rechts (Monospace), Zwischenüberschriften und Trennlinien.
- `danger` färbt Löschen/Stornieren in `loss` (Fehler-/Gefahrenfarbe, Regel 2). `align="end"` für Menüs am rechten Rand.

## Regeln

1. Nur **Aktionen**. Für eine Auswahl, die als Wert stehen bleibt, `Select` nehmen; für Navigation `Tabs` oder Links.
2. Die wichtigste Aktion gehört nicht ins Menü, sondern sichtbar daneben.
3. Gesperrte Einträge zeigen den Grund als Beschreibung („Nur mit Goldzugang“).
4. Nicht umkehrbare Einträge öffnen einen `Dialog` zur Bestätigung.

## Verwendung

```jsx
const { DropdownMenu } = window.Bankiersgruen;
<DropdownMenu label="Order" variant="ghost" align="end" items={[
  { heading: 'Limit-Kauf · 50 × HRD' },
  { label: 'Limit ändern', onSelect: editLimit },
  { divider: true },
  { label: 'Order löschen', danger: true, onSelect: confirmDelete }]} />
```

## Barrierefreiheit

- Menü-Muster: Auslöser mit `aria-haspopup="menu"` und `aria-expanded`; Liste `role="menu"`, Einträge `role="menuitem"`.
- Öffnen per Klick, Enter oder Pfeil ↓; Fokus springt auf den ersten Eintrag. ↑/↓/Pos1/Ende bewegen, Escape schließt und setzt den Fokus zurück, Tab oder Klick daneben schließt.
