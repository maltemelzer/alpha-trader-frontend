Die Eingabe schreibt und sendet Chat-Nachrichten; das Feld wächst mit dem Text, Senden ist ein Messing-Button.

## Aufbau

- **Feld:** `bg-page`, Rahmen `line-control`, `radius-md`; im Fokus Rahmen in `brass`. Wächst bis 160px, danach scrollt es.
- **Aktionen links (`actions`, optional):** Ghost-Buttons in `sm`, z. B. „Trade teilen“.
- **Senden rechts:** `Button` in `primary`/`sm`, gesperrt bei leerem Text.
- **Handy (bis 480px):** Feld und Senden bleiben in einer Zeile (Senden unten bündig, wenn das Feld wächst); Zusatzaktionen rücken in eine zweite Zeile darunter.
- **Hinweiszeile:** Standard „Enter senden · Umschalt+Enter neue Zeile“; ab 50 verbleibenden Zeichen ein Zähler in Mono (Standardgrenze 500).

## Zustände

- **Gesperrt (`disabled`):** Feld `bg-card`, Text `text-disabled`, Platzhalter nennt den Grund („Dieser Chat ist schreibgeschützt.“).
- **Grenze erreicht:** Zähler in `loss` (Fehler, Regel 2 erlaubt Fehlerfarbe).

## Regeln

1. **Eine Messing-Aktion** (Regel 1): Hat der Bildschirm schon eine, dann `sendVariant="secondary"`.
2. **Keine Emoji-Leiste, keine GIFs** im Standard – Alpha-Trader ist ein Börsenparkett, kein Messenger. Trades teilen ist die wichtigste Zusatzaktion.
3. **`$`-Ticker** werden beim Senden nicht verändert; die Erkennung passiert in `ChatThread`.

## Verwendung

```jsx
const { ChatComposer, Button } = window.Bankiersgruen;

<ChatComposer onSend={text => send(text)}
  actions={<Button variant="ghost" size="sm">Trade teilen</Button>} />

<ChatComposer disabled placeholder="Dieser Chat ist schreibgeschützt."
  hint="Nur der Besitzer kann hier schreiben." />
```

## Barrierefreiheit

- Das Feld hat ein Label (Standard „Nachricht schreiben“, unsichtbar) und ist mit Hinweis und Zähler über `aria-describedby` verbunden.
- Enter sendet, Umschalt+Enter macht eine neue Zeile; während einer IME-Eingabe sendet Enter nicht.
- Platzhalter `text-muted` auf `bg-page`: 6,1:1.
