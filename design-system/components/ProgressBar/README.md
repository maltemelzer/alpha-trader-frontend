Fortschrittsbalken für Ziele im Spiel, etwa der Fortschritt eines Erfolgs oder der Füllstand des Miners; in Messing, wenn am Ende eine Belohnung steht, sonst neutral.

## Aufbau

- Oben links ein Label in Versalien, rechts der Wert in Monospace („12.400 / 20.000 Pkt.“).
- Schiene 6px (`sm` 4px, `lg` 10px), eingelassen in `bg-page` mit Haarlinie `line-strong`, Ecken `radius-sm`. Flach, ohne Verlauf und ohne Glanz.
- Darunter optional ein Hinweis in `text-secondary`: „Belohnung: 10 AlphaCoins“.

## Varianten

| Variante | Füllung | Wofür |
| --- | --- | --- |
| `reward` (Standard) | `brass` | Fortschritt zu einem Erfolg mit AlphaCoin-Belohnung (Regel 5) |
| `neutral` | `text-secondary` | Alles ohne Belohnung: Portfolio investiert, Miner-Speicher, Laufzeit einer Anleihe |

## Regeln

1. **Nie Gewinn- oder Verlustfarben** für Fortschritt, auch nicht bei „Depot im Plus“ (Regel 2).
2. **Immer mit Zahl.** Der Balken allein reicht nicht; rechts oben steht der Wert.
3. **Höchstens ein Messing-Balken pro Bereich**, sonst verliert Messing seine Bedeutung.

## Verwendung

```jsx
const { ProgressBar } = window.Bankiersgruen;

<ProgressBar label="Erfolg: Level 6 Online" value={70.31} max={100} valueText="70,31 %"
             hint="Belohnung: 10 AlphaCoins" />
<ProgressBar label="Depot investiert" value={93.2} valueText="93,2 %" variant="neutral" />
```

## Barrierefreiheit

- `role="progressbar"` mit `aria-valuenow`, `aria-valuemax` und `aria-valuetext`, verknüpft mit dem Label.
- Die Füllung `brass` hat 8,1:1 gegenüber `bg-page`, `text-secondary` 7,0:1.
- Der Aufrufer liefert: `value`, `max` und ein `label` (oder `aria-label`).
