Umschalter für 2 bis 4 gleichrangige Optionen, von denen genau eine gewählt ist; etwa Kaufen/Verkaufen, Order-Typ oder der Zeitraum eines Kursdiagramms.

## Aufbau

- Eingelassene Leiste in `bg-page` mit Rahmen `line-control`, Ecken `radius-md`.
- **Gewählt:** Fläche `bg-raised`, Text `text-primary`, darunter eine 2px-Linie in `brass` – wie die Messing-Linie unter einer Zeitungsüberschrift.
- **Nicht gewählt:** Text `text-secondary`, beim Hover `text-primary`.

## Regeln

1. **Kaufen und Verkaufen sehen gleich aus.** Keine Gewinn-/Verlustfarben für die Richtung (Regel 2); die Messing-Linie zeigt nur, was gewählt ist.
2. **Höchstens 4 Optionen**, kurze Labels. Mehr Optionen → `Select`.
3. **Sofortige Wirkung:** Der Umschalter ändert die Ansicht oder das Formular direkt. Für Aktionen („Order senden“) immer einen `Button`.
4. **Zeitraum-Umschalter** über Diagrammen in `sm`: „1T · 1W · 1M · 1J“.

## Verwendung

```jsx
const { SegmentedControl } = window.Bankiersgruen;

<SegmentedControl aria-label="Richtung" value={side} onChange={setSide}
  options={[{ value: 'buy', label: 'Kaufen' }, { value: 'sell', label: 'Verkaufen' }]} />
<SegmentedControl label="Order-Typ" defaultValue="limit"
  options={[{ value: 'market', label: 'Market' }, { value: 'limit', label: 'Limit' }, { value: 'stop', label: 'Stop' }]} />
```

## Barrierefreiheit

- Radio-Gruppe (`role="radiogroup"`): Tab springt auf die gewählte Option, Pfeiltasten wechseln die Auswahl.
- Gewählt ist nicht nur Farbe: Fläche, hellerer Text und Messing-Linie. Fokus-Ring in `brass`.
- Text gewählt 10,1:1 auf `bg-raised`, nicht gewählt 7,0:1 auf `bg-page`.
- Der Aufrufer liefert: `label` oder `aria-label` und die Optionen.
