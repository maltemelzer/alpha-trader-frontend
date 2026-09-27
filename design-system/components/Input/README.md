Eingabefeld mit Label, Hinweis und Fehlermeldung; mit `numeric` für Stückzahlen, Limits und Beträge in Monospace und im deutschen Zahlenformat.

## Aufbau

- **Label** über dem Feld, in Versalien (`label`, `text-secondary`). Optionale Felder bekommen „(optional)“, Pflichtfelder keinen Stern.
- **Feld:** eingelassene Fläche in `bg-page` mit 1px-Rahmen `line-control`, Ecken `radius-sm`, Text 15px in `text-primary`.
- **Hinweis** darunter in `text-secondary`, z. B. „Aktueller Kurs 48,72 €“. Ein **Fehler** ersetzt den Hinweis.
- **Einheit** (`suffix`) rechts im Feld in Monospace `text-secondary`: „€“, „Stk.“, „%“.

## Varianten

| Variante | Wofür |
| --- | --- |
| Text (Standard) | Suche, Namen, Notizen |
| `numeric` | Alle Zahlen: Monospace, rechtsbündig, Zahlentastatur auf Mobilgeräten (`inputMode="decimal"`), Eingabe „1.234,50“ |
| `numeric` + `stepper` | Stückzahl: −/+ links und rechts, Pfeiltasten hoch/runter; nutzt `step`, `min`, `max` |

## Zustände

- **Hover:** Rahmen wird heller (`text-muted`).
- **Fokus:** Rahmen 2px in `brass`. Kein Glow.
- **Fehler:** Rahmen in `loss`, Meldung in `loss` mit ✕. Die Meldung sagt, was zu tun ist: „Nicht genug Bargeld – höchstens 172 Anteile.“, nicht „Ungültige Eingabe“.
- **Deaktiviert:** ohne Fläche, Rahmen `line`, Text `text-disabled`.
- **Nur lesen (`readOnly`):** Fläche `bg-raised`, kein Rahmen, für berechnete Werte wie verfügbares Bargeld.

## Größen

`sm` 28px (Filter in Tabellen) · `md` 36px (Standard) · `lg` 44px (Order-Maske auf Mobilgeräten, Touch).

## Regeln

1. **Immer ein sichtbares Label.** Platzhalter sind Beispiele („z. B. Nachkauf nach Dividende“), nie das Label.
2. **Zahlen immer `numeric`** mit Einheit als `suffix`, nie die Einheit in den Wert tippen lassen.
3. **Fehler erst nach dem Verlassen des Felds** oder beim Absenden anzeigen, nicht bei jedem Tastendruck.
4. **Kaufen/Verkaufen ist kein Feld**, sondern ein `SegmentedControl`. Beide Seiten sehen gleich aus (Regel 2).
5. **Eine Order-Maske hat genau einen Messing-Button** („Kauforder prüfen“), ganz unten, volle Breite.

## Verwendung

```jsx
const { Input } = window.Bankiersgruen;

<Input label="Stückzahl" numeric stepper min={1} step={1} suffix="Stk."
       value={qty} onChange={e => setQty(e.target.value)} />
<Input label="Limit" numeric suffix="€" hint="Aktueller Kurs 48,72 €" />
<Input label="Stückzahl" numeric suffix="Stk." error="Nicht genug Bargeld – höchstens 172 Anteile." />
<Input label="Suche" placeholder="Name, Ticker oder WKN" />
```

Der Wert kommt als Text im deutschen Format zurück („48,50“). Umwandeln in eine Zahl: Punkte entfernen, Komma durch Punkt ersetzen.

## Barrierefreiheit

- Label ist mit dem Feld verknüpft, Hinweis und Fehler über `aria-describedby`, Fehler setzt `aria-invalid`.
- Text im Feld 13,7:1 auf `bg-page`; Label und Hinweis 6,1:1 auf `bg-card`; Fehlertext 5,4:1.
- Platzhalter in `text-muted` 6,1:1 auf `bg-page`, Feldrahmen `line-control` 3,6:1.
- Die −/+ Knöpfe sind per Maus/Touch bedienbar; per Tastatur übernehmen die Pfeiltasten, damit der Tab-Weg kurz bleibt.
- Auf Touch-Geräten (`pointer: coarse`) sind −/+ 44 px breit und haben eine 44 px hohe Tippfläche (`::before`), auch im 36-px-Feld. Am Desktop bleiben sie 36 px breit.
- Der Aufrufer liefert: `label`, bei Fehlern einen konkreten Text, bei Zahlen `min`/`max`.
