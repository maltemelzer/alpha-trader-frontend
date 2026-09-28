Kästchen zum An- und Abwählen: Einstellungen, die erst mit „Speichern“ wirken, Bestätigungen vor riskanten Aktionen und Mehrfachauswahl in Listen.

## Aufbau

- Kästchen 18 × 18 px, Rahmen `line-control`, Fläche `bg-page`. Angekreuzt: Fläche `text-primary`, Haken in `bg-page`.
- **Kein Messing, kein Grün:** Messing gehört der einen Hauptaktion und Belohnungen (Regel 1, 5), Grün den Kursen (Regel 2). Der Fokusring ist Messing wie überall.
- Halb angekreuzt (`indeterminate`) für „Alle“, wenn nur einige Unterpunkte gewählt sind.
- Hinweis darunter in `text-secondary`, Fehler in `loss` mit ✕.

## Regeln

1. **Checkbox oder Switch?** Checkbox, wenn die Wahl erst mit einem Knopf wirkt (Formular, Bestätigung). Switch, wenn sie sofort wirkt.
2. **Beschriftung als Aussage**, nicht als Frage: „Nur Order prüfen, nicht ausführen“.
3. **Bestätigungen vor nicht umkehrbaren Aktionen** (Liquidation, Firmenauflösung) sind Pflicht-Checkboxen; der Aktionsknopf bleibt gesperrt, bis angekreuzt ist.
4. Gesperrte Optionen erklären, warum – z. B. „Nur mit <span class="bnk-gold">Gold</span>“ (neutral, nicht Messing).

## Verwendung

```jsx
const { Checkbox } = window.Bankiersgruen;

<Checkbox label="Nur Order prüfen, nicht ausführen" checked={checkOnly} onChange={e => setCheckOnly(e.target.checked)}
          hint="Entspricht checkOrderOnly – zeigt Ausführungskurs und Volumen." />
<Checkbox label="Alle Ereignisse" checked={all} indeterminate={some && !all} onChange={toggleAll} />
```

## Barrierefreiheit

- Echtes `<input type="checkbox">` (optisch versteckt), Label per `for` verknüpft – Leertaste schaltet, Screenreader liest „angekreuzt/nicht angekreuzt/teilweise“.
- Hinweis und Fehler über `aria-describedby`, Fehler setzt `aria-invalid`.
- Klickfläche mindestens 24 px hoch.
