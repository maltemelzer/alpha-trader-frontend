Der Editor für ein neues Thema (Titel, Bereich, Text) oder eine Antwort (nur Text), mit einfacher Formatierung und Vorschau.

## Aufbau
- **Neues Thema** (`mode="thread"`): Titel (`Input`, max. 120 Zeichen, Zähler ab 20 Rest) und Bereich (`Select`) nebeneinander, unter 640px untereinander.
- **Textfeld:** Rahmen `line-control`, Fläche `bg-page`, im Fokus Messing-Rahmen. Oben eine Leiste mit den Reitern **Schreiben / Vorschau** (Messing-Linie wie `Tabs`) und rechts der Formatierung: Fett, Kursiv, Zwischenüberschrift, Zitat, Liste, nummerierte Liste, Link, Aktie ($).
- **Vorschau:** zeigt den Text genau so, wie er im `ForumPost` erscheint, mit Ticker-Erwähnungen und Kursveränderung.
- **Fuß:** Kurzhilfe zur Formatierung in Mono links; rechts „Abbrechen“ (secondary) und „Thema veröffentlichen“ bzw. „Antworten“ (primary, gesperrt, solange Pflichtfelder leer sind).

## Formatierung
| Eingabe | Ergebnis |
| --- | --- |
| `**Text**` | fett |
| `*Text*` | kursiv |
| `## Text` / `### Text` | Zwischenüberschrift (h3 / h4 – die Hauptüberschrift ist der Titel) |
| `> Text` | Zitat |
| `- Text` | Aufzählung |
| `1. Text` | nummerierte Liste |
| `[Text](https://…)`, `https://…` | Link (extern in neuem Tab, `/…` intern) |
| `![Beschreibung](https://…)` | Bild (volle Breite höchstens) |
| `$HRD` | Ticker mit Kursveränderung |
Absätze durch eine Leerzeile, Zeilenumbruch bleibt Zeilenumbruch. Kein HTML: Links und Bilder nur mit `http(s)://` bzw. `/…`.

**Speichern im Spiel:** Das Original-Spiel schreibt Beiträge mit TinyMCE und speichert HTML (`<p>`, `<strong>`, `<em>`, `<h2>`, `<ul>/<ol>`, `<blockquote>`, `<a>`, `<img>`). Die App wandelt das Markup beim Senden in genau dieses HTML um und gespeichertes HTML zum Anzeigen zurück ins Markup (`ForumText` rendert nie HTML).

## Tastatur
- Strg/⌘ + B fett, Strg/⌘ + I kursiv, Strg/⌘ + Enter absenden.

## Regeln
1. Der Senden-Button ist die eine Messing-Aktion des Bildschirms. Liegt der Editor auf einer Seite mit anderer Hauptaktion: `submitVariant="secondary"`.
2. Die Vorschau ist Pflicht-Angebot, nicht Pflicht-Schritt: veröffentlichen geht auch aus „Schreiben“.

## Verwendung
```jsx
const { ForumEditor } = window.Bankiersgruen;

<ForumEditor mode="thread" heading="Neues Thema" categories={[{ value: 'strat', label: 'Strategien' }]}
  tickers={tickers} onCancel={close} onSubmit={({ title, category, body }) => save(title, category, body)} />

<ForumEditor ref={editor} mode="reply" onSubmit={({ body }) => reply(body)} />
// editor.current.insertQuote('Frieda Kontor', 'Ist das Plus schon eingepreist?'); editor.current.focus();
```

## Barrierefreiheit
- Reiter mit `role="tab"`, Formatierung als `toolbar` mit beschrifteten Knöpfen („Fett“, „Aktie erwähnen“).
- Textfeld ist mit der Kurzhilfe verbunden (`aria-describedby`). Platzhalter `text-muted` 6,1:1.
