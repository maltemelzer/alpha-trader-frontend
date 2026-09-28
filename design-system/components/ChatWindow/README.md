Das Chatfenster verbindet die Unterhaltungsliste, den Verlauf und die Eingabe zu einer Fläche; es dient für Direktnachrichten, Gruppen- und Allianz-Chats und die öffentlichen Lobbys.

## Aufbau

- **Links (optional, `list`):** `ConversationList`, 300px breit, getrennt durch eine Haarlinie.
- **Kopf:** Titel in der Serifenschrift, darunter `subtitle` in `text-secondary` (z. B. „12 Mitglieder · 4 online“). Rechts Nebenaktionen als Ghost-Buttons.
- **Hinweis (optional, `notice`):** ein `Banner` über dem Verlauf, z. B. die Regeln einer Lobby.
- **Verlauf (`children`):** meist `ChatThread`, scrollt allein.
- **Eingabe (`composer`):** `ChatComposer`, unten fest.
- **Fläche:** `bg-card`, `radius-md`, Höhe über `height` (Standard 560px). Flach, kein Schatten.

## Unterhaltungsarten

| Art | Liste | Verlauf |
| --- | --- | --- |
| Direktnachricht | runder Kreis mit Kürzel | `showNames={false}`, Lesestatus unter eigenen Nachrichten |
| Gruppe / Allianz (`groupChat`) | eckiges Feld mit „#“ oder Kürzel | Namen und ggf. Highscore-Medaille über fremden Nachrichten |
| Lobby (`publicChat`) | eckiges Feld mit „№“ | wie Gruppe, plus Regel-Banner (`notice`); `readonly` sperrt die Eingabe |

## Responsiv

Das Fenster ist ein Container (`container-type: inline-size`). Unter 720px Breite zeigt es nur eine Spalte: mit `mobileShowList` die Liste, sonst den Verlauf mit einem Zurück-Knopf (`onBack`).

## Regeln

1. **Senden ist die Messing-Aktion** im Chat (Regel 1). Liegt das Fenster auf einem Bildschirm mit eigener Hauptaktion (z. B. der Order-Maske), bekommt der Composer `sendVariant="secondary"`.
2. **Keine Grün/Rot-Farben** für Online-Status, gelesen oder gesendet (Regel 2). Farbig sind nur Kursveränderungen in Ticker-Erwähnungen und geteilten Trades.
3. **Belohnungen bleiben Messing-Tint** (Regel 5): Ränge erscheinen als `RankBadge` am Namen, nicht als farbige Blase.
4. **Öffentliche Lobbys brauchen Moderation:** Regel-Banner, Melden-Aktion im Kopf; schreibgeschützte Chats (`readonly`) zeigen einen gesperrten Composer mit Begründung.

## Verwendung

```jsx
const { ChatWindow, ConversationList, ChatThread, ChatComposer, Button, Banner } = window.Bankiersgruen;

<ChatWindow
  title="Hanseatische Allianz" subtitle="12 Mitglieder · 4 online"
  actions={<Button variant="ghost" size="sm">Mitglieder</Button>}
  list={<ConversationList groups={groups} onSelect={open} />}
  composer={<ChatComposer onSend={send} actions={<Button variant="ghost" size="sm">Trade teilen</Button>} />}>
  <ChatThread messages={messages} tickers={tickers} typing="Frieda schreibt …" />
</ChatWindow>

<ChatWindow title="Lobby (de)" subtitle="152 online"
  notice={<Banner>Keine Kaufempfehlungen gegen Geld, keine Beleidigungen. Verstöße melden.</Banner>}
  composer={<ChatComposer onSend={send} />}>…</ChatWindow>
```

## Barrierefreiheit

- Das Fenster ist eine `section` mit dem Titel als Überschrift (`aria-labelledby`).
- Der Zurück-Knopf hat das Label „Zurück zu den Unterhaltungen“.
- Der Aufrufer liefert: Titel, beim Wechsel der Unterhaltung den Fokus in die Eingabe.
