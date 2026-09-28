Erfolg mit Medaille: freigeschaltet in Messing-Tönung mit Datum, gesperrt neutral mit gestrichelter Medaille und Fortschritt.

## Aufbau

- **Medaille** links, 44px: freigeschaltet mit 2px-Ring in `brass` und feinem Innenring, gesperrt als gestrichelter Kreis in `line-strong`. In der Mitte ein Zeichen in der Serifenschrift (`symbol`, Standard: erster Buchstabe des Titels).
- **Titel** in der Serifenschrift, darunter eine Zeile Beschreibung in `text-secondary`.
- **Freigeschaltet:** Fläche `brass-tint`, Titel `reward-text`, darunter „Erreicht am 23.09.2026“ in `brass`. Optional „Neu“ als Messing-umrandetes Etikett.
- **Gesperrt:** Fläche `bg-card`, darunter ein neutraler `ProgressBar` („57 / 100 Trades“).

## API

`UserAchievementView` (erreicht: `description`, `coinReward`, `achievedDate`, `claimed`) und `UserAchievementProgressView` (`progressInPercent`). Nicht abgeholte Belohnungen (`claimed: false`) bekommen „Neu“ und eine Aktion „Abholen“ (`PUT /v2/my/userachievementclaim/{id}`) – als sekundärer Button, die Messing-Fläche ist schon die Belohnung.

## Regeln

1. **Erfolge in einem Raster** (2 oder 3 Spalten), freigeschaltete zuerst, dann gesperrte nach Fortschritt.
2. **„Neu“ nur bis zum ersten Ansehen.**
3. **Keine Bilder oder Emojis in der Medaille** – Buchstaben oder Ziffern in der Serifenschrift, wie Initialen in einer Zeitung.
4. **Gesperrte Erfolge sind sichtbar**, damit Spieler wissen, was es zu erreichen gibt. Geheime Erfolge zeigen „???“ als Titel.

## Verwendung

```jsx
const { Achievement } = window.Bankiersgruen;

<Achievement unlocked isNew title="Top 10 % Nutzer" description="Platz in den oberen 10 % eines Nutzer-Highscores · 3 AlphaCoins" date="23.09.2026" symbol="T" />
<Achievement title="Hundert Trades" description="100 Trades in einer Woche · 10 AlphaCoins" progress={{ value: 57, max: 100, unit: 'Trades' }} />
```

## Barrierefreiheit

- Status wird zusätzlich als Text vorgelesen („Erfolg erreicht“ / „noch nicht erreicht“), nicht nur über Farbe.
- `reward-text` auf `brass-tint` 8,7:1, Beschreibung 6,2:1; auf `bg-card` 11,8:1 und 6,1:1.
- Der Aufrufer liefert: Titel, Beschreibung, bei freigeschalteten Erfolgen das Datum, bei gesperrten den Fortschritt.
