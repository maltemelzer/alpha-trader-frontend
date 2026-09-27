Zustand einer Order in Versalien mit einem kleinen Form-Zeichen; neutral gehalten, nur „Abgelehnt“ steht in der Verlustfarbe.

## Zustände

| Status | Zeichen | Farbe | Bedeutung |
| --- | --- | --- | --- |
| `pending` In Prüfung | gestrichelter Kreis | `text-secondary` | Order wird geprüft |
| `open` Offen | leerer Kreis | `text-secondary` | wartet auf Ausführung |
| `partial` Teilweise ausgeführt | halb gefüllter Kreis | `text-primary` | z. B. „Teilweise · 120 / 300“ |
| `filled` Ausgeführt | gefüllter Kreis | `text-primary` | fertig |
| `cancelled` Storniert | Strich, Text durchgestrichen | `text-secondary` / `text-muted` | vom Spieler gelöscht |
| `expired` Abgelaufen | leeres Quadrat | `text-secondary` / `text-muted` | Gültigkeit vorbei |
| `rejected` Abgelehnt | Kreuz | `loss` | Fehler, z. B. zu wenig Bargeld |

## Regeln

1. **Kein Grün für „Ausgeführt“.** Grün und Rot gehören den Kursen (Regel 2); „Ausgeführt“ ist hell und gefüllt, das reicht.
2. **Rot nur für „Abgelehnt“**, weil das ein Fehler ist.
3. **Nie nur über Farbe:** Jeder Zustand hat ein eigenes Zeichen und ein Wort.
4. **Keine Fläche, keine Pill.** Der Status steht wie eine Rubrik im Text.

## Verwendung

```jsx
const { StatusLabel } = window.Bankiersgruen;

<StatusLabel status="open" />
<StatusLabel status="partial">Teilweise · 120 / 300</StatusLabel>
<StatusLabel status="rejected" />
```

In `DataTable` als Spalte mit `render: r => <StatusLabel status={r.status} />`, rechtsbündig.

## Barrierefreiheit

- Das Wort trägt die Bedeutung, das Zeichen ist dekorativ (`aria-hidden`).
- `text-secondary` 6,1:1, `text-primary` 11,8:1, `loss` 5,4:1 auf `bg-card`.
