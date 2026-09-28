Spieler per Namen suchen und auswählen – für neue Unterhaltungen, Einladungen in Gruppen und Allianzen, Überweisungen an Spieler.

## Aufbau

- **Feld** wie `Input` mit Label, Platzhalter „Spielername suchen“. Unter zwei Zeichen steht der Hinweis „Mindestens 2 Zeichen eingeben.“.
- **Gewählte** darunter als Chips: Kürzel (`Avatar` 20px), Name, ✕ zum Entfernen (28px Tippfläche). Rahmen `line-control`, Ecken `radius-pill`.
- **Treffer** als Liste mit Haarlinien, je Zeile 44px hoch: Kürzel, Name, optional ein Zusatz rechts (`meta`, z. B. „online“). Enter übernimmt den ersten Treffer.
- Gewählte und `exclude` erscheinen nicht in den Treffern.

## Verhalten

- Die Komponente sucht nicht selbst: `onSearch` liefert den Text, der Aufrufer lädt `GET /api/search/users/{namePart}` (entprellt) und gibt `results` zurück.
- Nach der Auswahl wird das Feld geleert, der Fokus bleibt im Feld.

## Regeln

1. Kein Messing: Auswählen ist keine Hauptaktion. Die Hauptaktion („Unterhaltung beginnen“, „Einladen“) steht als eigener Knopf daneben.
2. Den eigenen Spieler nicht anbieten – der Aufrufer filtert `myUser` aus den Treffern.

## Verwendung

```jsx
const { UserPicker, Button } = window.Bankiersgruen;

<UserPicker label="Mit" value={users} onChange={setUsers}
  onSearch={setQuery} results={hits} loading={loading} exclude={memberNames} />
<Button variant="primary" disabled={!users.length}>Unterhaltung beginnen</Button>
```

## Barrierefreiheit

- Treffer sind echte Buttons in einer Liste mit `aria-live="polite"`; ✕ hat das Label „<Name> entfernen“.
- Der Aufrufer liefert: das Label und die Treffer passend zum Suchtext.
