Mehrzeiliges Textfeld im Stil von `Input`: Beschreibungen von Allianzen und Unternehmen, Kommentare, Pressetexte, Begründungen.

## Aufbau

- Gleicher Rahmen wie `Input` (`line-control` auf `bg-page`, Fokusring Messing), Label, Hinweis und Fehler über dem bzw. unter dem Feld.
- Mindestens 88 px hoch (`rows`, Standard 4), vom Nutzer senkrecht vergrößerbar.
- Mit `maxLength` zählt ein Zähler die Zeichen („120 / 2.000“) in Monospace; ab 90 % wird er hervorgehoben und für Screenreader angesagt.

## Regeln

1. Für einzeilige Eingaben immer `Input` – `Textarea` nur, wenn Zeilenumbrüche sinnvoll sind.
2. Grenzen aus der API als `maxLength` setzen, statt erst beim Speichern zu scheitern.
3. Texte, die als HTML gespeichert werden (Beschreibungen, Artikel), beim Speichern umwandeln – das Feld selbst nimmt reinen Text.

## Verwendung

```jsx
const { Textarea } = window.Bankiersgruen;

<Textarea label="Beschreibung" maxLength={2000} value={text} onChange={e => setText(e.target.value)}
          hint="Wird auf der Allianzseite angezeigt." />
```

## Barrierefreiheit

- Echtes `<textarea>` mit `label for`; Hinweis und Fehler über `aria-describedby`, Fehler setzt `aria-invalid`.
- Zähler mit `aria-live="polite"` erst ab 90 %, damit nicht jeder Tastendruck angesagt wird.
