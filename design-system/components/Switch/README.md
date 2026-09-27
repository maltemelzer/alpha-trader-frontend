Schalter für Einstellungen, die **sofort** wirken: Zahlen abkürzen, Farbenblind-Modus, Live-Kurse.

## Aufbau

- Schiene 36 × 20 px. Aus: eingelassen (`bg-page`, Rahmen `line-control`), Knopf `text-secondary`. An: Schiene `text-primary`, Knopf `bg-page` rechts.
- Rechts steht der Zustand als Wort („An/Aus“, frei wählbar mit `onText`/`offText`), damit er nicht nur an der Position erkennbar ist.
- Kein Messing, kein Grün (wie Checkbox).

## Regeln

1. Nur für sofort wirksame Einstellungen. Braucht es „Speichern“, nimm `Checkbox`.
2. Beschriftung beschreibt den eingeschalteten Zustand: „Kurse live aktualisieren“, nicht „Live-Kurse an/aus“.
3. Nicht für Kauf/Verkauf oder Ja/Nein-Stimmen – dafür `SegmentedControl` bzw. die Stimmknöpfe.

## Verwendung

```jsx
const { Switch } = window.Bankiersgruen;
<Switch label="Große Zahlen abkürzen (Mio., Mrd.)" checked={compact} onChange={setCompact} hint="Der volle Wert steht im Tooltip." />
```

## Barrierefreiheit

- `<button role="switch" aria-checked>`; Leertaste und Enter schalten. Das Wort „An/Aus“ ist `aria-hidden`, weil `aria-checked` den Zustand schon ansagt.
