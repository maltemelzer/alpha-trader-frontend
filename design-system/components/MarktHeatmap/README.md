Treemap des ganzen Marktes: Kacheln nach Allianz-Index gruppiert (Rest unter „Ohne Allianz“), Fläche = Marktkapitalisierung, Farbe = Tagesveränderung.

## Aufbau
- Allianz-Indizes als Gruppen mit Überschrift in Versalien, Kacheln mit 2px-Fuge in `bg-card`.
- Kachel: Ticker fett, darunter Veränderung mit ▲/▼ und Vorzeichen (Mono, `text-primary`). Zu kleine Kacheln zeigen keinen Text (Tooltip reicht).
- Farbe: gemischt aus `gain-tint` → `gain` bzw. `loss-tint` → `loss`, Stärke 6–42 % je nach Betrag, ab ±3 % gesättigt. Unverändert: `bg-raised`. Die Mischung wird aus den Tokens berechnet, im Farbenblind-Modus also automatisch Blau/Orange.
- Fuß: Farbskala mit sieben Stufen und Beschriftung (▼ −3 % … ▲ +3 %).
- Tooltip: Name, Ticker, Veränderung, Börsenwert.

## Regeln
- Farbe zeigt hier eine Kursbewegung – deshalb sind `gain`/`loss` erlaubt (Regel 2), aber nur als Mischung: Text in `text-primary` muss lesbar bleiben (≥ 4,3:1 bei voller Stärke).
- Die Veränderung steht immer als Text in der Kachel (Regel 3), nicht nur als Farbe.
- Keine Farbe außerhalb dieser Skala, auch nicht für die Gruppen.

## Was der Aufrufer liefert
Liste der Aktien mit Gruppe, ASIN, Name, Marktkapitalisierung und Tagesveränderung in %.
