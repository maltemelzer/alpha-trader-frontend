Hinweis für leere Listen: leeres Depot, keine offenen Orders, keine Treffer.

## Aufbau

- Zentriert: kleines § zwischen zwei Haarlinien (Zeitungsstil), Überschrift in Serif, ein Satz in `text-secondary`, höchstens eine Aktion.
- `compact` für Karten und Seitenleisten; `symbol={false}` ohne Zeichen.

## Regeln

1. Sagen, **was hier erscheinen wird**, nicht nur, dass nichts da ist.
2. Höchstens eine Aktion, `secondary` – außer die leere Seite hat sonst keine Hauptaktion, dann darf es der eine Messing-Knopf sein.
3. Keine Illustrationen, keine Scherze bei Fehlern. Bei Suchen den Suchbegriff wiederholen.
4. Fehler beim Laden sind kein leerer Zustand → `Banner` in `error`.

## Verwendung

```jsx
const { EmptyState, Button } = window.Bankiersgruen;
<EmptyState title="Noch keine Wertpapiere" action={<Button>Wertpapiere suchen</Button>}>
  Ihr Depot ist leer. Kaufen Sie Aktien, Anleihen oder Coins, dann erscheinen sie hier.
</EmptyState>
```

## Barrierefreiheit

- Überschrift ist standardmäßig `h3` (`as` anpassen, damit die Gliederung stimmt). Das § ist `aria-hidden`.
