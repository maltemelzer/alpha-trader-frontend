Eine Wahl aus mehreren Optionen, wenn die Optionen eine Erklärung brauchen – etwa die Art einer Kapitalerhöhung.

## Aufbau

- `fieldset` mit Überschrift im Label-Stil (Versalien, `text-secondary`).
- Punkt 18 px, gewählt: Rahmen und Innenpunkt `text-primary`, Titel halbfett. Beschreibung darunter in `text-secondary`.
- `inline` legt kurze Optionen nebeneinander („Nein · Ja“).

## Regeln

1. **RadioGroup, SegmentedControl oder Select?** 2–4 kurze Optionen ohne Erklärung → `SegmentedControl`. Optionen mit Erklärung → `RadioGroup`. Mehr als 6 → `Select`.
2. Eine sinnvolle Vorauswahl setzen, außer die Wahl hat Folgen, die der Spieler bewusst treffen soll (dann leer lassen und bei Fehlen einen Fehler zeigen).
3. Kaufen/Verkaufen bleibt `SegmentedControl` in Tintenblau/Kupfer-Logik der Order-Maske, nicht RadioGroup.

## Verwendung

```jsx
const { RadioGroup } = window.Bankiersgruen;
<RadioGroup label="Art der Kapitalerhöhung" value={type} onChange={setType} options={[
  { value: 'WITH_SUBSCRIPTION_RIGHTS', label: 'Mit Bezugsrecht', description: 'Bestehende Aktionäre zeichnen zuerst …' },
  { value: 'WITHOUT_SUBSCRIPTION_RIGHTS', label: 'Ohne Bezugsrecht', description: 'Neue Aktien gehen an alle Bieter …' }]} />
```

## Barrierefreiheit

- Native Radios mit gemeinsamem `name`: Pfeiltasten wechseln, Tab springt in die Gruppe hinein und heraus.
- `legend` benennt die Gruppe; Hinweis/Fehler über `aria-describedby` am `fieldset`.
