Das Vorschlagsmenü erscheint im Chat, sobald man `#` (verlinken) oder `!` (Karte anhängen) tippt: Wertpapiere nach Name oder ASIN, direkt über dem Eingabefeld.

## Aufbau

- **Kopfzeile:** „Wertpapier verlinken“ bzw. „Karte anhängen“ in `label`-Schrift, rechts die Tasten (↑↓ wählen · Enter · Esc; am Handy ausgeblendet).
- **Treffer:** Name in Serif 15px, darunter ASIN in Mono und die Art (`LISTING_TYPES`); rechts der letzte Kurs (Anleihen in %). Jede Zeile ≥ 44px.
- **Markierung:** wie `StockSearch` – `bg-raised` und Messing-Kante links.
- **Ohne Treffer:** eine Zeile Text (`emptyText`, z. B. „Name oder ASIN tippen“) bzw. „Suche …“ bei `loading`.
- Höchstens 480px breit (am Handy volle Feldbreite) und 320px bzw. halbe Bildschirmhöhe hoch, die Liste scrollt.

## Regeln

1. **Steuert nichts selbst.** `active`, `onActive`, `onPick` kommen vom Aufrufer; die Pfeiltasten bleiben im Eingabefeld (`ChatComposer onKeyDown`), das Menü nimmt nie den Fokus (`mousedown` wird abgefangen).
2. **Keine Kursfarben** in der Liste – sie ist eine Auswahl, keine Marktübersicht.

## Verwendung

```jsx
const { ChatComposer, MentionMenu } = window.Bankiersgruen;

<ChatComposer value={text} onChange={setText} onKeyDown={onKeyDown}
  inputProps={{ role: 'combobox', 'aria-controls': 'mention', 'aria-activedescendant': 'mention-o' + active }}
  popup={<MentionMenu id="mention" mode="embed" items={hits} active={active} onActive={setActive} onPick={pick} />} />
```

## Barrierefreiheit

- Liste `role="listbox"`, Treffer `role="option"` mit `aria-selected`; Optionen heißen `${id}-o${i}` – das Feld zeigt per `aria-activedescendant` auf die markierte.
- Der Zustand ohne Treffer ist `role="status"` und wird vorgelesen.
