Platzhalter, solange Daten aus der API laden. `Loading` verpackt ihn mit einer Statusmeldung für Screenreader.

## Aufbau

- Flache Flächen in `bg-raised`, Ecken `radius-sm`, ruhiges Pulsieren (1,6 s). Bei „Bewegung reduzieren“ starr.
- Varianten: `text` (eine oder mehrere Zeilen, letzte kürzer), `title`, `block` (Diagramm), `circle` (Avatar), `rows` (Tabellenzeilen mit rechtsbündigen Zahlenspalten).

## Regeln

1. Der Platzhalter hat ungefähr die Form des Inhalts, damit beim Laden nichts springt.
2. **Unter 300 ms nichts zeigen** – kurze Anfragen sollen nicht flackern.
3. Keine Zahlen „0“ oder „–“ als Platzhalter: Sie sehen aus wie echte Werte.
4. Beim Nachladen einer Liste (Seite 2) bleiben die alten Zeilen stehen; nur `Button loading` am Auslöser.

## Verwendung

```jsx
const { Loading, Skeleton } = window.Bankiersgruen;
{data ? <DataTable … /> : <Loading label="Depot wird geladen …" rows={5} columns={4} />}
<Skeleton variant="block" height={260} />
```

## Barrierefreiheit

- Skeleton ist `aria-hidden`. `Loading` hat `role="status"`, `aria-busy` und einen unsichtbaren Text („Wird geladen …“).
