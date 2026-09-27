Hinweis, der auf der Seite stehen bleibt, bis sich die Lage ändert: laufende Kapitalmaßnahme, Wartung, abholbarer Erfolg, Verbindungsfehler.

## Varianten

| Variante | Aussehen | Wofür |
| --- | --- | --- |
| `info` (Standard) | `bg-raised`, Haarlinie `line-strong`, Zeichen *i* | Kapitalmaßnahmen, Abstimmungen, Wartung, Erklärungen in Dialogen |
| `reward` | `brass-tint`, Rahmen `brass-pressed`, kleine Medaille | Erfolg erreicht, AlphaCoins abholbar (Regel 5) |
| `error` | `loss-tint`, Rahmen und Titel `loss`, Zeichen ! | Fehler, die das Spielen behindern: Verbindung weg, Orders gesperrt |

## Aufbau

- Zeichen links, Titel 14px halbfett, darunter ein Satz in `text-secondary`. Zahlen mit `<span className="num">` in Monospace.
- Rechts optional eine Aktion (`secondary`, `sm`) und ✕, wenn der Hinweis weggeklickt werden darf.
- Volle Breite des Inhalts, oben auf der Seite unter der Überschrift oder oben in einer Karte.

## Banner, Toast oder Dialog?

| Fall | Komponente |
| --- | --- |
| Zustand, der gilt, bis er sich ändert (Kapitalerhöhung läuft, Verbindung weg) | `Banner` |
| Rückmeldung auf eine Aktion, verschwindet von selbst | `Toast` |
| Entscheidung nötig, bevor es weitergeht | `Dialog` |

## Regeln

1. **Höchstens ein Banner pro Bereich.** Mehrere Hinweise zu einem zusammenfassen.
2. **Kein Grün**, auch nicht für gute Nachrichten – gute Spielnachrichten sind `reward`.
3. **Fehler-Banner nicht wegklickbar**, solange der Fehler besteht.
4. **Konkret:** „Die Kurse sind seit 17:31 Uhr nicht aktuell. Orders sind gesperrt.“ statt „Es ist ein Fehler aufgetreten.“

## Verwendung

```jsx
const { Banner, Button } = window.Bankiersgruen;

<Banner title="Kapitalerhöhung läuft" action={<Button size="sm">Bezugsrechte ansehen</Button>}>
  Zeichnung bis Sonntag, <span className="num">14:00</span> Uhr.
</Banner>
<Banner variant="error" title="Verbindung unterbrochen" action={<Button size="sm">Neu laden</Button>}>…</Banner>
```

## Barrierefreiheit

- `info` und `reward` sind `role="status"`, `error` ist `role="alert"` und wird sofort vorgelesen.
- Text 5,2:1 auf `bg-raised`; auf `loss-tint` Titel 5,2:1, Text 11,4:1; auf `brass-tint` Titel 8,7:1.
