Vorschläge des Spiels („Vorschläge“ auf der Organisations-Seite): je Zeile eine Rubrik, der Text des Spiels und eine Aktion.

## Aufbau

- Rubrik in Versalien aus `SUGGESTION_TYPES` (z. B. „Gewinn mitnehmen“), darunter `text.filledString`.
- Rechts ein sekundärer Knopf mit dem passenden Verb („Verkaufen“, „Abstimmen“, „Als CEO bewerben“).
- **Erfolge** (`*_ACHIEVEMENT`) sind Belohnungen: Zeile in `brass-tint`, Rubrik in `reward-text`, kleine Medaille (Regel 5). Alle anderen Vorschläge neutral.

## Regeln

1. Nicht mehr als 5 Vorschläge auf einmal zeigen; der Rest über „Alle“.
2. Der Knopf führt zur vorbelegten Maske (Order, Abstimmung) – er führt nichts direkt aus.
3. Leer: kompakter `EmptyState`.

## API

- `GET /api/v2/suggestions?page&size` → `Suggestion { type, text, actionData, unit }`.
- `actionData` ist im Spec untypisiert; die Vorbelegung muss je Typ aus den Daten gelesen werden (**offen**).

## Verwendung

```jsx
<SuggestionList suggestions={page.content} onAction={s => handleSuggestion(s)} />
```
