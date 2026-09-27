Fläche, die über die Seite fährt: auf dem Handy von unten, am Desktop von rechts. Hauptzweck: die Order-Maske aus einer Liste oder dem Orderbuch heraus öffnen, ohne die Seite zu verlassen.

## Aufbau

- `side="auto"` (Standard): unter 720 px von unten mit Griffleiste und max. 88 % Höhe, ab 720 px 420 px breit von rechts.
- Kopf mit Serif-Titel und Messing-Linie wie `Dialog`, Inhalt scrollt, Fußleiste mit Knöpfen bleibt stehen (unten mit Abstand für die Home-Leiste).
- Hintergrund mit `bg-page` abgedeckt; Klick darauf schließt.

## Regeln

1. **Sheet oder Dialog?** Sheet für Aufgaben mit Formular, bei denen der Seiteninhalt Kontext bleibt (Order, Filter, Benachrichtigungen am Handy). Dialog für kurze Bestätigungen.
2. Der eine Messing-Knopf des Bildschirms liegt im Sheet, solange es offen ist.
3. Nicht verschachteln: kein Sheet aus einem Sheet.
4. Nach dem Absenden schließen und das Ergebnis als `Toast` melden.

## Verwendung

```jsx
const { Sheet, OrderTicket, Button } = window.Bankiersgruen;
<Sheet open={open} onClose={() => setOpen(false)} title="Kaufen: Hanse Reederei">
  <OrderTicket listing={listing} spread={spread} accounts={accounts} onSubmit={submit} />
</Sheet>
```

## Barrierefreiheit

- `role="dialog"`, `aria-modal`, Titel über `aria-labelledby`. Fokus springt ins Sheet (erstes Feld oder `data-autofocus`), Tab bleibt darin, Escape schließt, danach geht der Fokus zurück an den Auslöser.
- Die Seite dahinter scrollt nicht mit. Bei „Bewegung reduzieren“ ohne Einfahren.
