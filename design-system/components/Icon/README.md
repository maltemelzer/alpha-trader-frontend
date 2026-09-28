Eigener, kleiner Icon-Satz (33 Zeichen) im Stil der Zeitung: dünne Linien, keine Füllungen, keine Farbe.

## Aufbau

- 20 × 20-Raster, Linie 1,5 px, runde Enden und Ecken, `stroke="currentColor"` – das Icon nimmt die Textfarbe an.
- Größen: **16** in Knöpfen, Tabellen und Menüs · **20** Standard · **24** in der mobilen Navigation.
- Gruppen: Navigation (Markt, Organisation, Orders, Highscores, Community, Zeitung, Chat, Benachrichtigungen, Suche) · Wertpapiere und Organisation (Portfolio, Bank, AlphaCoins, Anleihe, Index, Miner, Erfolge, Spieler, Allianz) · Aktionen (Einstellungen, Abmelden, Hinzufügen, Schließen, Erledigt, Externer Link, Merken, Filter, Aktualisieren, Überweisung, Menü) · Hinweise (Zeit, Datum, Hinweis, Warnung).

## Regeln

1. **Icons ergänzen Text, sie ersetzen ihn nicht.** Ein Knopf nur mit Icon braucht `title` (wird zu `aria-label`).
2. **Keine Pfeile für Kursrichtung.** ▲/▼ bleiben Textzeichen der Kurse (Regel 3), der Winkel ⌄ gehört den Ausklappern.
3. Keine Farbe im Icon selbst; Messing nur, wenn der ganze Knopf Messing ist.
4. Neue Icons im gleichen Raster zeichnen – keine Icon-Bibliothek mischen.

## Verwendung

```jsx
const { Icon, Button } = window.Bankiersgruen;
<Button size="sm" iconStart={<Icon name="ueberweisung" size={16} />}>Überweisen</Button>
<button aria-label="Suche"><Icon name="suche" /></button>
<Icon name="warnung" title="Speicher voll" />
```
