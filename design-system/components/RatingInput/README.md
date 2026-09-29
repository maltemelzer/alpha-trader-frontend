Bewertung mit Sternen – für Feedback zu Varianten einer Seite (Experimente) und kurze Umfragen.

## Aufbau

- `fieldset` mit Überschrift im Label-Stil, darunter 1–5 Sterne und rechts das Wort zur Stufe
  („schlecht · geht so · okay · gut · sehr gut“, eigene Wörter per `labels`).
- Leer: Umriss in `text-secondary`. Gewählt bzw. unter dem Zeiger: gefüllt in Messing.
- `size="lg"`: 44-px-Sterne auch mit Maus (Dialoge, Sheets). Am Touch sind die Sterne immer 44 × 44 px.

## Regeln

1. Nur für Meinungen („Wie gefällt dir …?“), nie für Spielwerte oder Ränge – dafür gibt es `RankBadge`/`ProgressBar`.
2. Keine Vorauswahl: Der Spieler soll bewusst wählen. Ohne Wahl nicht absenden (Knopf deaktiviert oder `error`).
3. Zusammen mit einem freien Kommentar (`Textarea` mit Zähler) anbieten; der Kommentar ist freiwillig.

## Verwendung

```jsx
const { RatingInput } = window.Bankiersgruen;
<RatingInput label="Wie gefällt dir diese Startseite?" size="lg" value={stars} onChange={setStars} />
```

## Barrierefreiheit

- Native Radios mit gemeinsamem `name`: Pfeiltasten wechseln die Stufe, Tab springt hinein und heraus.
- Jeder Stern hat einen Screenreader-Text „4 von 5 – gut“; das sichtbare Wort ist `aria-hidden`.
