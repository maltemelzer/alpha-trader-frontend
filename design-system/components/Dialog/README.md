Modales Fenster für Schritte, die eine bewusste Entscheidung brauchen: Order-Bestätigung vor dem Senden, Rückfrage vor dem Stornieren.

## Aufbau

- **Hintergrund:** Die Seite wird mit `bg-page` abgedunkelt (82 %). Kein Weichzeichner, kein Schatten.
- **Fenster:** `bg-card`, Haarlinie `line-strong`, Ecken `radius-md`. Breiten: `sm` 400px (Rückfragen), `md` 520px (Standard, Order-Bestätigung), `lg` 720px.
- **Kopf:** Rubrik (`eyebrow`) und Titel in der Serifenschrift, darunter die 2px-Messing-Linie wie bei einer Hauptüberschrift (Regel 6). Rechts ✕.
- **Inhalt:** optional ein Satz (`description`), dann z. B. `SummaryList` und `Banner`.
- **Fuß:** Haarlinie, Knöpfe rechtsbündig: links der Nebenknopf („Zurück“, „Behalten“), rechts die Hauptaktion. Auf Handys volle Breite, Hauptaktion oben.

## Die zwei Muster im Spiel

| Muster | Titel | Knöpfe |
| --- | --- | --- |
| **Order-Bestätigung** | „Hanse Reederei AG kaufen“, Rubrik „Kauforder prüfen“ | `secondary` „Zurück“ · `primary` „Jetzt kaufen“ |
| **Rückfrage** (`role="alertdialog"`, `size="sm"`) | „Order stornieren?“ + ein Satz, was passiert | `secondary` „Behalten“ · `danger` „Stornieren“ |

## Regeln

1. **Ein Dialog nur für Entscheidungen.** Hinweise gehören in ein `Banner`, Rückmeldungen in einen `Toast`.
2. **Die Hauptaktion nennt die Folge:** „Jetzt kaufen“, „Stornieren“ – nie „OK“ oder „Ja“.
3. **Die Messing-Taste im Dialog ist die eine Messing-Taste des Bildschirms.** Der Messing-Knopf der Seite darunter ist abgedunkelt.
4. **Bei destruktiven Rückfragen** ist der Hauptknopf `danger`, nicht Messing.
5. **Während die Order gesendet wird:** `dismissible={false}` und `loading` am Knopf, damit nichts doppelt geht.
6. Keine Dialoge in Dialogen.

## Verwendung

```jsx
const { Dialog, SummaryList, Banner, Button } = window.Bankiersgruen;

<Dialog open={open} onClose={close} eyebrow="Kauforder prüfen" title="Hanse Reederei AG kaufen"
  actions={<>
    <Button onClick={close}>Zurück</Button>
    <Button variant="primary" loading={sending} onClick={send}>Jetzt kaufen</Button>
  </>}>
  <SummaryList items={orderItems} />
  <Banner>Limit-Order: Ausführung nur zu 48,50 € oder günstiger.</Banner>
</Dialog>
```

## Barrierefreiheit

- `role="dialog"` bzw. `alertdialog`, `aria-modal`, Titel über `aria-labelledby`, Beschreibung über `aria-describedby`.
- Beim Öffnen springt der Fokus in den Dialog (erstes Bedienelement oder `data-autofocus`), Tab bleibt im Dialog, Escape schließt, danach kehrt der Fokus zum Auslöser zurück. Die Seite scrollt nicht mit.
- Der Aufrufer liefert: `open`, `onClose`, `title` und die Knöpfe in `actions`.
