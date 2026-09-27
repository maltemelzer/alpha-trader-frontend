Kurze Meldung unten rechts, etwa „Kauforder ausgeführt“, „Erfolg freigeschaltet“ oder „Order abgelehnt“; verschwindet von selbst oder per ✕.

## Varianten

| Variante | Aussehen | Wofür |
| --- | --- | --- |
| `info` (Standard) | `bg-raised`, Rahmen `line-strong`, Zeichen ✓ | Bestätigungen: Order ausgeführt, Watchlist aktualisiert, Einstellung gespeichert |
| `reward` | `brass-tint`, Rahmen `brass-pressed`, kleine Medaille | Erfolg freigeschaltet, AlphaCoins erhalten (Regel 5) |
| `error` | Rahmen und Titel in `loss`, Zeichen ✕ | Fehler: Order abgelehnt, Verbindung verloren |

**Bewusst ohne Grün für Erfolgsmeldungen:** Gewinn- und Verlustfarben gehören den Kursen (Regel 2). „Order ausgeführt“ ist keine Kursbewegung, deshalb neutral. Rot bleibt, weil Fehler ausdrücklich zu Regel 2 gehören.

## Aufbau

- Titel 14px halbfett, darunter Text in `text-secondary`. Zahlen darin mit `<span className="num">` in Monospace.
- Optional eine Aktion als Ghost-Button („Order ansehen“) und ✕ zum Schließen.
- Stapel unten rechts (`ToastRegion`), neueste unten, höchstens 3 gleichzeitig. Einblenden mit kurzem Anheben, bei „Bewegung reduzieren“ ohne.

## Regeln

1. **Nur für Rückmeldungen auf Aktionen des Spielers oder Spielereignisse.** Nicht für Werbung oder Hinweise, die man lesen muss.
2. **Dauer:** `info` und `reward` 6 Sekunden (`duration={6000}`), `error` bleibt, bis der Spieler schließt.
3. **Konkret schreiben:** „50 × HRD zu 48,72 € – Gesamt 2.436,00 €“ statt „Order erfolgreich“.
4. **Kursalarme** („HRD über 50 €“) sind `info`; die Kursrichtung steht als `PriceChange` im Text.

## Verwendung

```jsx
const { ToastRegion, Toast, Button } = window.Bankiersgruen;

<ToastRegion>
  {toasts.map(t => (
    <Toast key={t.id} variant={t.variant} title={t.title} duration={t.variant === 'error' ? undefined : 6000}
           onClose={() => remove(t.id)} action={t.orderId && <Button variant="ghost" size="sm">Order ansehen</Button>}>
      {t.text}
    </Toast>
  ))}
</ToastRegion>
```

## Barrierefreiheit

- `ToastRegion` ist eine Live-Region (`aria-live="polite"`); Fehler nutzen `role="alert"` und werden sofort vorgelesen.
- Text auf `bg-raised` 10,1:1 (Titel) und 5,2:1; `loss` auf `bg-raised` 4,6:1 – knapp über der Grenze, daher Fehlertitel halbfett.
- Schließen-Knopf mit `aria-label`; Meldungen mit Aktion nicht automatisch ausblenden, wenn die Aktion wichtig ist.
- Der Aufrufer liefert: Zustand der Meldungen (hinzufügen, entfernen) und `onClose`.
